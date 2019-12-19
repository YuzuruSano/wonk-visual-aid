import axios from 'axios';

export default class SVG {
    getSvgInfo(selector) {
        const svgElement = document.querySelector(selector);
        const viewBoxParams = svgElement.getAttribute('viewBox').split(' ').map((param) => +param);
        return {
            element: svgElement,
            viewBox: {
                x: viewBoxParams[0],
                y: viewBoxParams[1],
                width: viewBoxParams[2],
                height: viewBoxParams[3]
            }
        };
    }

    getFile(file, selector = 'svg') {
        return axios.get(file)
            .then(function (response) {
                const svg = response.data;
                document.body.insertAdjacentHTML('beforeend', svg);
                return svg;
            })
            .then((svg) => {
                const info = this.getSvgInfo(selector);
                return info;
            })
            .catch(function (error) {
                console.log(error);
            })
    }
}