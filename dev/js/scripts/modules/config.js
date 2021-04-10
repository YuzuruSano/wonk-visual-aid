const config = {
    global_fps : 16,
    pulse_or_line : 32,
    hide_pulse_or_line: 64,
    fill_pulse_black: 48,
    reset_white: 33,
    reset_red: 49,
    reset_yellow: 65,
    textTypes : {
       39: ':)1/K',55: 'AXIS', 71: 'BIAS'
    },
    map_threshold : 18,
    map_reset: 34
}

export const get_global_fps = (sk, mh) => {
    const velocity = (mh.info.velocity) ? mh.info.velocity : 0.01;
    if (mh.info.note === config.global_fps) {
        return Math.floor(sk.map(velocity, 1, 127, 3, 60));
    }else{
        return 1;
    }
}

export default config;