export const $autowrap = $('.js-autowrap');
export const $wrap = $('#wrap');
export const size = [
    'short', 'tall', 'grande', 'venti',
];
export const animation = [
    'leAboundBottom',
    'leDoorCloseRight',
    'leVerticalShake',
    'leZoomOutTop',
    'leRotateOutLeft'
];
export const wWidth = $(window).width();
export const wheight = $(window).height() * 0.5;

$autowrap.css({
    width: $(window).width(),
    height: $(window).height()
});

// MIDIデバイス
export let midiDevices = {
    inputs: {},
    outputs: {}
};