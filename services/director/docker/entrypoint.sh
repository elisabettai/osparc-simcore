#!/bin/sh
#
INFO="INFO: [`basename "$0"`] "
ERROR="ERROR: [`basename "$0"`] "

# This entrypoint script:
#
# - Executes *inside* of the container upon start as --user [default root]
# - Notice that the container *starts* as --user [default root] but
#   *runs* as non-root user [scu]
#
echo $INFO "Entrypoint for stage ${SC_BUILD_TARGET} ..."
echo $INFO "User    :`id $(whoami)`"
echo $INFO "Workdir :`pwd`"


if [[ ${SC_BUILD_TARGET} == "development" ]]
then
    # NOTE: expects docker run ... -v $(pwd):/devel/services/director
    DEVEL_MOUNT=/devel/services/director

    stat $DEVEL_MOUNT &> /dev/null || \
        (echo $ERROR "You must mount '$DEVEL_MOUNT' to deduce user and group ids" && exit 1) # FIXME: exit does not stop script

    USERID=$(stat -c %u $DEVEL_MOUNT)
    GROUPID=$(stat -c %g $DEVEL_MOUNT)
    GROUPNAME=$(getent group ${GROUPID} | cut -d: -f1)

    if [[ $USERID -eq 0 ]]
    then
        addgroup scu root
    else
        # take host's credentials
        if [[ -z "$GROUPNAME" ]]
        then
            GROUPNAME=host_group
            addgroup -g $GROUPID $GROUPNAME
        else
            addgroup scu $GROUPNAME
        fi

        deluser scu &> /dev/null
        adduser -u $USERID -G $GROUPNAME -D -s /bin/sh scu
    fi
fi


if [[ ${SC_BOOT_MODE} == "debug-ptvsd" ]]
then
  # NOTE: production does NOT pre-installs ptvsd
  python3 -m pip install ptvsd
fi

# Appends docker group if socket is mounted
DOCKER_MOUNT=/var/run/docker.sock

stat $DOCKER_MOUNT &> /dev/null
if [[ $? -eq 0 ]]
then
    GROUPID=$(stat -c %g $DOCKER_MOUNT)
    GROUPNAME=docker

    addgroup -g $GROUPID $GROUPNAME &> /dev/null
    if [[ $? -gt 0 ]]
    then
        # if group already exists in container, then reuse name
        GROUPNAME=$(getent group ${GROUPID} | cut -d: -f1)
    fi
    addgroup scu $GROUPNAME
fi

exec su-exec scu "$@"
