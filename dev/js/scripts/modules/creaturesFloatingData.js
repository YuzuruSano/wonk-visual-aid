const staticPath = (process.env.NODE_ENV == 'development') ? '../' : '/assets/'
const creaturesFloatingData = [
    {
        svg: `${staticPath}images/path1.svg`,
        currentImg: {},
        img: `${staticPath}images/creature1.gif`,
        staticImg: `${staticPath}images/creatureStatic.png`,
        imgBomb: `${staticPath}images/bomb.gif`,
        imgLast: `${staticPath}images/bomb1.gif`,
        nowPathPosition: 0,
        prevX: 0,
        prevY: 0,
        isJumping: false,
        up: true,
        jumpStartAt: 0,
        jumpMax: 300,
        onStart: true,
        bombFrame: 0,
        midi:[0x90, "0x24", 0x7f]
    },
    {
        svg: `${staticPath}images/path2.svg`,
        currentImg: {},
        img: `${staticPath}images/creature2.gif`,
        staticImg: `${staticPath}images/creatureStatic2.png`,
        imgBomb: `${staticPath}images/bomb.gif`,
        imgLast: `${staticPath}images/bomb2.gif`,
        nowPathPosition: 0,
        prevX: 0,
        prevY: 0,
        isJumping: false,
        up: true,
        jumpStartAt: 0,
        jumpMax: 300,
        onStart: true,
        bombFrame: 0,
        midi:[0x90, "0x25", 0x7f]
    },
    {
        svg: `${staticPath}images/path3.svg`,
        currentImg: {},
        img: `${staticPath}images/creature3.gif`,
        staticImg: `${staticPath}images/creatureStatic3.png`,
        imgBomb: `${staticPath}images/bomb.gif`,
        imgLast: `${staticPath}images/bomb3.gif`,
        nowPathPosition: 0,
        prevX: 0,
        prevY: 0,
        isJumping: false,
        up: true,
        jumpStartAt: 0,
        jumpMax: 300,
        onStart: false,
        bombFrame: 0,
        midi:[0x90, "0x26", 0x7f]
    },
    {
        svg: `${staticPath}images/path4.svg`,
        currentImg: {},
        img: `${staticPath}images/creature4.gif`,
        staticImg: `${staticPath}images/creatureStatic4.png`,
        imgBomb: `${staticPath}images/bomb.gif`,
        imgLast: `${staticPath}images/bomb4.gif`,
        nowPathPosition: 0,
        prevX: 0,
        prevY: 0,
        isJumping: false,
        up: true,
        jumpStartAt: 0,
        jumpMax: 300,
        onStart: false,
        bombFrame: 0,
        midi:[0x90, "0x27", 0x7f]
    },
    {
        svg: `${staticPath}images/path5.svg`,
        currentImg: {},
        img: `${staticPath}images/creature5.gif`,
        staticImg: `${staticPath}images/creatureStatic.png`,
        imgBomb: `${staticPath}images/bomb.gif`,
        imgLast: `${staticPath}images/bomb5.gif`,
        nowPathPosition: 0,
        prevX: 0,
        prevY: 0,
        isJumping: false,
        up: true,
        jumpStartAt: 0,
        jumpMax: 300,
        onStart: true,
        bombFrame: 0,
        midi:[0x90, "0x28", 0x7f]
    },
    {
        svg: `${staticPath}images/path6.svg`,
        currentImg: {},
        img: `${staticPath}images/creature6.gif`,
        staticImg: `${staticPath}images/creatureStatic2.png`,
        imgBomb: `${staticPath}images/bomb.gif`,
        imgLast: `${staticPath}images/bomb6.gif`,
        nowPathPosition: 0,
        prevX: 0,
        prevY: 0,
        isJumping: false,
        up: true,
        jumpStartAt: 0,
        jumpMax: 300,
        onStart: true,
        bombFrame: 0,
        midi:[0x90, "0x29", 0x7f]
    },
    {
        svg: `${staticPath}images/path7.svg`,
        currentImg: {},
        img: `${staticPath}images/creature7.gif`,
        staticImg: `${staticPath}images/creatureStatic3.png`,
        imgBomb: `${staticPath}images/bomb.gif`,
        imgLast: `${staticPath}images/bomb7.gif`,
        nowPathPosition: 0,
        prevX: 0,
        prevY: 0,
        isJumping: false,
        up: true,
        jumpStartAt: 0,
        jumpMax: 300,
        onStart: false,
        bombFrame: 0,
        midi:[0x90, "0x30", 0x7f]
    }
];
export default creaturesFloatingData;