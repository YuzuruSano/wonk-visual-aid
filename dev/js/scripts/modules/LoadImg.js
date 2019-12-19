export default class LoadImg{
    /**
     * 画像ロード完了時にpromiseを返却する
     * async/awaitでwrapして利用する
     * 
     * @param object p5 skech
     * @param string imgPath
     * @param String parent element
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
     * @param object p5 skech
     * @param string imgPath
     * @param String parent element
     */
    load(p5, imgPath, parent = 'wrap') {
        return new Promise((resolve, reject) => {
            const p = p5.loadImage(imgPath, () => {
                resolve(p);
            });
        })
    }
}