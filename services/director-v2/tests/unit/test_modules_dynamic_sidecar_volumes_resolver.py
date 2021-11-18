# pylint: disable=redefined-outer-name

import os
from pathlib import Path
from typing import Any, Callable, Dict, List
from uuid import uuid4

import pytest
from simcore_service_director_v2.models.schemas.constants import (
    DYNAMIC_SIDECAR_SERVICE_PREFIX,
)
from simcore_service_director_v2.modules.dynamic_sidecar.volumes_resolver import (
    DynamicSidecarVolumesPathsResolver,
)


# FIXTURES
@pytest.fixture(scope="module")
def compose_namespace() -> str:
    return f"{DYNAMIC_SIDECAR_SERVICE_PREFIX}_{uuid4()}"


@pytest.fixture(scope="module")
def node_uuid() -> str:
    return f"{uuid4()}"


@pytest.fixture(scope="module")
def state_paths() -> List[Path]:
    return [Path(f"/tmp/asd/asd/{x}") for x in range(10)]


@pytest.fixture
def expect(node_uuid: str) -> Callable[[str, str], Dict[str, Any]]:
    def _callable(source: str, target: str) -> Dict[str, Any]:
        return {
            "Source": source,
            "Target": target,
            "Type": "volume",
            "VolumeOptions": {"Labels": {"uuid": node_uuid}},
        }

    return _callable


# TESTS


def test_expected_paths(
    compose_namespace: str,
    node_uuid: str,
    state_paths: List[Path],
    expect: Callable[[str, str], Dict[str, Any]],
) -> None:
    path = Path("/inputs")
    assert DynamicSidecarVolumesPathsResolver.mount_entry(
        compose_namespace, path, node_uuid
    ) == expect(source=f"{compose_namespace}_inputs", target="/dy-volumes/inputs")

    path = Path("/outputs")
    assert DynamicSidecarVolumesPathsResolver.mount_entry(
        compose_namespace, path, node_uuid
    ) == expect(source=f"{compose_namespace}_outputs", target="/dy-volumes/outputs")

    for path in state_paths:
        name_from_path = str(path).replace(os.sep, "_")
        assert DynamicSidecarVolumesPathsResolver.mount_entry(
            compose_namespace, path, node_uuid
        ) == expect(
            source=f"{compose_namespace}{name_from_path}",
            target=f"/dy-volumes/{name_from_path.strip('_')}",
        )