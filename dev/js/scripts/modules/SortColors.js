import chroma from 'chroma-js';

export default class SortColors {
	constructor(p5){
		this.p5 = p5;
		this.RED = "red";
		this.GREEN = "green";
		this.BLUE = "blue";
		this.HUE = "hue";
		this.SATURATION = "saturation";
		this.BRIGHTNESS = "brightness";
		this.GRAYSCALE = "grayscale";
		this.ALPHA = "alpha";
	}
	
	sort(colors,method){
		const p5 = this.p5;
		
		// sort red
		if (method == this.RED) colors.sort(function (a, b) {
			if (p5.red(a) < p5.red(b)) return -1;
			if (p5.red(a) > p5.red(b)) return 1;
			return 0;
		});

		// sort green
		if (method == this.GREEN) colors.sort(function (a, b) {
			if (p5.green(a) < p5.green(b)) return -1;
			if (p5.green(a) > p5.green(b)) return 1;
			return 0;
		});

		// sort blue
		if (method == this.BLUE) colors.sort(function (a, b) {
			if (p5.blue(a) < p5.blue(b)) return -1;
			if (p5.blue(a) > p5.blue(b)) return 1;
			return 0;
		});

		// sort hue
		if (method == this.HUE) colors.sort(function (a, b) {
			//convert a and b from RGB to HSV
			const aHue = chroma(p5.red(a), p5.green(a), p5.blue(a)).get('hsv.h');
			const bHue = chroma(p5.red(b), p5.green(b), p5.blue(b)).get('hsv.h');

			if (aHue < bHue) return -1;
			if (aHue > bHue) return 1;
			return 0;
		});

		// sort saturation
		if (method == this.SATURATION) colors.sort(function (a, b) {
			//convert a and b from RGB to HSV
			const aSat = chroma(p5.red(a), p5.green(a), p5.blue(a)).get('hsv.s');
			const bSat = chroma(p5.red(b), p5.green(b), p5.blue(b)).get('hsv.s');

			if (aSat < bSat) return -1;
			if (aSat > bSat) return 1;
			return 0;
		});

		// sort brightness
		if (method == this.BRIGHTNESS) colors.sort(function (a, b) {
			//convert a and b from RGB to HSV
			const aBright = chroma(p5.red(a), p5.green(a), p5.blue(a)).get('hsv.v');
			const bBright = chroma(p5.red(b), p5.green(b), p5.blue(b)).get('hsv.v');

			if (aBright < bBright) return -1;
			if (aBright > bBright) return 1;
			return 0;
		});

		// sort grayscale
		if (method == this.GRAYSCALE) colors.sort(function (a, b) {
			const aGrey = (p5.red(a) * 0.222 + p5.green(a) * 0.707 + p5.blue(a) * 0.071);
			const bGrey = (p5.red(b) * 0.222 + p5.green(b) * 0.707 + p5.blue(b) * 0.071);

			if (aGrey < bGrey) return -1;
			if (aGrey > bGrey) return 1;
			return 0;
		});

		// sort alpha
		if (method == this.ALPHA) colors.sort(function (a, b) {
			if (alpha(a) < alpha(b)) return -1;
			if (alpha(a) > alpha(b)) return 1;
			return 0;
		});

		return colors;
	}
	
}
