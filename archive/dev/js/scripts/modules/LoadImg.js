export default class LoadImg{
    /**
     * 画像ロード完了時にpromiseを返却する
     * async/awaitでwrapして利用する
     * 
     * @param {Object} p5 skech
     * @param {String} imgPath
     * @param {String} parent element
     * @return {Object} promise
     */
    create(p5, imgPath, parent = 'wrap'){
        return new Promise((resolve, reject) => {
            const p = p5.createImg(imgPath, 'p', '', () => {
                resolve(p);
            }).parent(parent);
        })
    }

    /**
     * 画像ロード完了時にpromiseを返却する
     * async/awaitでwrapして利用する
     * 
     * @param {Object} p5 skech
     * @param {String} imgPath
     * @param {String} parent element
     * @return {Object} promise
     */
    load(p5, imgPath, parent = 'wrap') {
        return new Promise((resolve, reject) => {
            const p = p5.loadImage(imgPath, () => {
                resolve(p);
            });
        })
    }
}