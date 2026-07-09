function info(message, meta) {
    if (typeof meta === 'undefined') {
        console.log(message);
        return;
    }
    console.log(message, meta);
}

function warn(message, meta) {
    if (typeof meta === 'undefined') {
        console.warn(message);
        return;
    }
    console.warn(message, meta);
}

function error(message, meta) {
    if (typeof meta === 'undefined') {
        console.error(message);
        return;
    }
    console.error(message, meta);
}

module.exports = {
    info,
    warn,
    error
};

