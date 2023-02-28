import asyncio
import json
import logging
from typing import Optional

import asyncpg
from aiohttp import web
from pydantic import ValidationError
from servicelib.aiohttp.application_setup import ModuleCategory, app_module_setup

from .._constants import (
    APP_OPENAPI_SPECS_KEY,
    APP_PUBLIC_CONFIG_PER_PRODUCT,
    APP_SETTINGS_KEY,
    INDEX_RESOURCE_NAME,
)
from ..db import setup_db
from ..db_settings import PostgresSettings
from ..db_settings import get_plugin_settings as get_db_plugin_settings
from ..email import setup_email
from ..email_settings import SMTPSettings
from ..email_settings import get_plugin_settings as get_email_plugin_settings
from ..invitations import setup_invitations
from ..products import ProductName, list_products, setup_products
from ..redis import setup_redis
from ..rest import setup_rest
from ._constants import APP_LOGIN_SETTINGS_PER_PRODUCT_KEY
from .routes import create_routes
from .settings import (
    APP_LOGIN_OPTIONS_KEY,
    LoginOptions,
    LoginSettings,
    LoginSettingsForProduct,
)
from .storage import APP_LOGIN_STORAGE_KEY, AsyncpgStorage

log = logging.getLogger(__name__)


MAX_TIME_TO_CLOSE_POOL_SECS = 5


async def _setup_login_storage_ctx(app: web.Application):
    assert APP_LOGIN_STORAGE_KEY not in app  # nosec
    settings: PostgresSettings = get_db_plugin_settings(app)

    pool: asyncpg.pool.Pool = await asyncpg.create_pool(
        dsn=settings.dsn_with_query,
        min_size=settings.POSTGRES_MINSIZE,
        max_size=settings.POSTGRES_MAXSIZE,
        loop=asyncio.get_event_loop(),
    )
    app[APP_LOGIN_STORAGE_KEY] = storage = AsyncpgStorage(pool)

    yield  # ----------------

    if storage.pool is not pool:
        log.error("Somebody has changed the db pool")

    try:
        await asyncio.wait_for(pool.close(), timeout=MAX_TIME_TO_CLOSE_POOL_SECS)
    except asyncio.TimeoutError:
        log.exception("Failed to close login storage loop")


def setup_login_storage(app: web.Application):
    if _setup_login_storage_ctx not in app.cleanup_ctx:
        app.cleanup_ctx.append(_setup_login_storage_ctx)


def _setup_login_options(app: web.Application):
    settings: SMTPSettings = get_email_plugin_settings(app)

    cfg = settings.dict()
    if INDEX_RESOURCE_NAME in app.router:
        cfg["LOGIN_REDIRECT"] = f"{app.router[INDEX_RESOURCE_NAME].url_for()}"

    app[APP_LOGIN_OPTIONS_KEY] = LoginOptions(**cfg)


async def _resolve_login_settings_per_product(app: web.Application):
    """Resolves login settings by composing app and product configurations
    for the login plugin. Note that product settings override app settings.
    """
    # app plugin settings
    app_login_settings: Optional[LoginSettings]
    login_settings_per_product: dict[ProductName, LoginSettingsForProduct] = {}

    if app_login_settings := app[APP_SETTINGS_KEY].WEBSERVER_LOGIN:
        assert app_login_settings, "setup_settings not called?"  # nosec
        assert isinstance(app_login_settings, LoginSettings)  # nosec

        # compose app and product settings

        errors = {}
        for product in list_products(app):
            try:
                login_settings_per_product[
                    product.name
                ] = LoginSettingsForProduct.create_from_composition(
                    app_login_settings=app_login_settings,
                    product_login_settings=product.login_settings,
                )
            except ValidationError as err:
                errors[product.name] = err

        if errors:
            msg = "\n".join([f"{n}: {e}" for n, e in errors.items()])
            raise ValueError(f"Invalid product.login_settings:\n{msg}")

    # store in app
    app[APP_LOGIN_SETTINGS_PER_PRODUCT_KEY] = login_settings_per_product

    log.info(
        "Captured products login settings:\n%s",
        json.dumps(
            {
                product_name: login_settings.dict()
                for product_name, login_settings in login_settings_per_product.items()
            },
            indent=1,
        ),
    )

    # product-based public config: Overrides  ApplicationSettings.public_dict
    public_data_per_product = {}
    for product_name, settings in login_settings_per_product.items():
        public_data_per_product[product_name] = {
            "invitation_required": settings.LOGIN_REGISTRATION_INVITATION_REQUIRED
        }

    app.setdefault(APP_PUBLIC_CONFIG_PER_PRODUCT, public_data_per_product)


@app_module_setup(
    "simcore_service_webserver.login",
    ModuleCategory.ADDON,
    settings_name="WEBSERVER_LOGIN",
    logger=log,
)
def setup_login(app: web.Application):
    """Setting up login subsystem in application"""

    setup_db(app)
    setup_redis(app)
    setup_products(app)
    setup_rest(app)
    setup_email(app)
    setup_invitations(app)

    # routes
    specs = app[APP_OPENAPI_SPECS_KEY]
    routes = create_routes(specs)
    app.router.add_routes(routes)

    _setup_login_options(app)
    setup_login_storage(app)

    app.on_startup.append(_resolve_login_settings_per_product)

    return True
