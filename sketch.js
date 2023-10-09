// -----------------------------------------------------------------------------
// Global
// -----------------------------------------------------------------------------
let gameState;
let capture;
let sounds = {};
let time;

// -----------------------------------------------------------------------------
// Utility
// -----------------------------------------------------------------------------
function randint(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function clip(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function rgb2hsv(r, g, b) {
    const maxColor = Math.max(r, g, b);
    const minColor = Math.min(r, g, b);
    let h, s, v;

    if (maxColor === minColor) {
        h = 0;
    }
    else if (maxColor === r) {
        h = 60 * ((g - b) / (maxColor - minColor));
    }
    else if (maxColor === g) {
        h = 60 * ((b - r) / (maxColor - minColor)) + 120;
    }
    else if (maxColor === b) {
        h = 60 * ((r - g) / (maxColor - minColor)) + 240;
    }

    if (h < 0) {
        h += 360;
    }

    if (maxColor !== 0) {
        s = ((maxColor - minColor) / maxColor) * 255;
    }
    else {
        s = 0;
    }

    v = maxColor;

    h = Math.floor(clip(h, 0, 359));
    s = Math.floor(clip(s, 0, 255));
    v = Math.floor(clip(v, 0, 255));

    return [h, s, v];
}

function timeToStr(time) {
    time = Math.floor(time / 1000);
    const m = Math.floor(time / 60);
    const s = time % 60;
    return `${m}分${s}秒`;
}

// Setに和集合を定義
Set.prototype.union = function (setB) {
    const union = new Set(this);
    for (let elem of setB) {
        union.add(elem);
    }
    return union;
}

// Setに差集合を定義
Set.prototype.difference = function (setB) {
    const difference = new Set(this);
    for (let elem of setB) {
        difference.delete(elem);
    }
    return difference;
}

// -----------------------------------------------------------------------------
// p5.js functions
// -----------------------------------------------------------------------------
function preload() {
    sounds.next = loadSound('assets/next.mp3');
    sounds.prev = loadSound('assets/prev.mp3');
    sounds.ok = loadSound('assets/ok.mp3');
    sounds.start = loadSound('assets/start.mp3');
    sounds.finish = loadSound('assets/finish.mp3');
    sounds.drop = loadSound('assets/drop.mp3');
    sounds.music = loadSound('assets/music.mp3');
}

function setup() {
    const params = getURLParams();
    if (params.debug) { console.warn('Debug Mode'); }
    const initScene = (params.debug && params.scene) ? params.scene : 'title';

    createCanvas(windowWidth, windowHeight);
    colorMode(HSB);

    capture = createCapture({ audio: false, video: { facingMode: "environment" } });
    capture.hide();

    gameState = new BaseGameScene();
    gameState.changeScene(initScene);
}

function draw() {
    gameState.draw();
}

// -----------------------------------------------------------------------------
// Classes
// -----------------------------------------------------------------------------
class MomentaryButton {
    #element;
    isPressed = false;

    constructor() {
        this.#element = createButton('');
        this.#element.mousePressed(() => { this.event('pressed'); });
        this.#element.touchStarted(() => { this.event('pressed'); });
        this.#element.mouseReleased(() => { this.event('released'); });
        this.#element.touchEnded(() => { this.event('released'); });
        const buttonSize = Math.floor(Math.min(width, height) * 0.3);
        this.#element.attribute('style', `width:${buttonSize}px; height:${buttonSize}px;`);
    }

    class(className) {
        this.#element.class(className);
    }

    event(event) {
        console.assert(['pressed', 'released'].includes(event));

        switch (event) {
            case 'pressed':
                this.isPressed = true;
                break;
            case 'released':
                this.isPressed = false;
                break;
        }
    }

    remove() {
        this.#element.remove();
    }
}

class Color {
    #h;
    #s;
    #v;
    #a;

    setColor(color) {
        console.assert(Array.isArray(color));
        console.assert(color.length === 3 || color.length === 4);

        this.setH(color[0]);
        this.setS(color[1]);
        this.setV(color[2]);
        this.setA(color.length === 4 ? color[3] : 255);
    }

    setH(h) {
        console.assert(Number.isInteger(h));
        console.assert(0 <= h && h <= 359);

        this.#h = h;
    }

    setS(s) {
        console.assert(Number.isInteger(s));
        console.assert(0 <= s && s <= 255);

        this.#s = s;
    }

    setV(v) {
        console.assert(Number.isInteger(v));
        console.assert(0 <= v && v <= 255);

        this.#v = v;
    }

    setA(a) {
        console.assert(Number.isInteger(a));
        console.assert(0 <= a && a <= 255);

        this.#a = a;
    }

    getColor(includeAlpha = true) {
        console.assert(Number.isInteger(this.#h));
        console.assert(Number.isInteger(this.#s));
        console.assert(Number.isInteger(this.#v));
        console.assert(includeAlpha === false || Number.isInteger(this.#a));

        if (includeAlpha) {
            return color(this.#h, this.#s, this.#v, this.#a);
        }
        else {
            return color(this.#h, this.#s, this.#v);
        }
    }

    getH() {
        console.assert(Number.isInteger(this.#h));

        return this.#h;
    }

    getS() {
        console.assert(Number.isInteger(this.#s));

        return this.#s;
    }
}

class Accelerate {
    #acc;
    #maxAcc;
    #currentAcc;

    constructor(accelerate, maxAccelerate) {
        console.assert(Number.isFinite(accelerate));
        console.assert(Number.isFinite(maxAccelerate));
        console.assert(0.0 < accelerate);
        console.assert(accelerate <= maxAccelerate);

        this.#acc = accelerate;
        this.#maxAcc = maxAccelerate;
        this.#currentAcc = 0.0;
    }

    acceleratePlus() {
        console.assert(Number.isFinite(this.#acc));
        console.assert(Number.isFinite(this.#maxAcc));
        console.assert(Number.isFinite(this.#currentAcc));

        this.#currentAcc += this.#acc;
        this.#currentAcc = clip(this.#currentAcc, -this.#maxAcc, this.#maxAcc);
    }

    accelerateMinus() {
        console.assert(Number.isFinite(this.#acc));
        console.assert(Number.isFinite(this.#maxAcc));
        console.assert(Number.isFinite(this.#currentAcc));

        this.#currentAcc -= this.#acc;
        this.#currentAcc = clip(this.#currentAcc, -this.#maxAcc, this.#maxAcc);
    }

    decelerate() {
        console.assert(Number.isFinite(this.#acc));
        console.assert(Number.isFinite(this.#currentAcc));

        if (this.#currentAcc > this.#acc) {
            this.accelerateMinus();
        }
        else if (this.#currentAcc < -this.#acc) {
            this.acceleratePlus();
        }
        else {
            this.#currentAcc = 0.0;
        }
    }

    getAccelerate() {
        console.assert(Number.isFinite(this.#currentAcc));

        return this.#currentAcc;
    }
}

class PhysicalObject {
    _object;

    set object(object) {
        console.assert(object instanceof matter.PhysicalObject);

        this._object = object;
    }

    get object() {
        console.assert(this._object instanceof matter.PhysicalObject);

        return this._object;
    }

    set group(group) {
        console.assert(Number.isInteger(group));
        console.assert(group <= -1);

        this._object.body.collisionFilter.group = group;
    }

    get group() {
        console.assert(this._object instanceof matter.PhysicalObject);

        return this._object.body.collisionFilter.group;
    }

    getPositionX() {
        console.assert(this._object instanceof matter.PhysicalObject);

        return this._object.getPositionX();
    }

    getPositionY() {
        console.assert(this._object instanceof matter.PhysicalObject);

        return this._object.getPositionY();
    }
}

class Ball extends PhysicalObject {
    #color

    constructor(x, y, diameter, group) {
        super();
        this.object = matter.makeBall(x, y, diameter);
        this.group = group;
        this.#color = new Color();
    }

    set color(color) {
        console.assert(this.#color instanceof Color);

        this.#color.setColor(color);
    }

    get color() {
        console.assert(this.#color instanceof Color);

        return this.#color;
    }

    draw() {
        stroke(0);
        strokeWeight(3);
        fill(this.#color.getColor());
        this.object.show();
    }
}

class ScaleScheduler {
    scale;
    targetScale;
    waitTime;
    elapsedTime;
    velocity;

    constructor(initScale, targetScale, waitTime, velocity) {
        console.assert(Number.isFinite(initScale));
        console.assert(Number.isFinite(targetScale));
        console.assert(Number.isFinite(waitTime));
        console.assert(Number.isFinite(velocity));
        console.assert(initScale <= targetScale);
        console.assert(waitTime >= 0.0);
        console.assert(velocity >= 0.0);

        this.scale = initScale;
        this.targetScale = targetScale;
        this.waitTime = waitTime;
        this.elapsedTime = 0.0;
        this.velocity = velocity;
    }

    update() {
        this.elapsedTime += deltaTime;
        if (this.elapsedTime >= this.waitTime) {
            this.scale = Math.min(this.scale + this.velocity * deltaTime, this.targetScale);
        }
        scale(this.scale);
    }

    completed() {
        return this.scale === this.targetScale;
    }
}

class BaseGameScene {
    setup() {
    }

    draw() {
    }

    teardown() {
    }

    changeScene(scene) {
        console.assert(['title', 'level', 'play-easy', 'play-normal', 'play-hard', 'clear', 'how-to-play'].includes(scene));

        gameState.teardown();
        switch (scene) {
            case 'title':
                gameState = new GameTitle();
                break;
            case 'level':
                gameState = new GameSelectLevel();
                break;
            case 'play-easy':
                gameState = new GamePlay('easy');
                break;
            case 'play-normal':
                gameState = new GamePlay('normal');
                break;
            case 'play-hard':
                gameState = new GamePlay('hard');
                break;
            case 'clear':
                gameState = new GameClear();
                break;
            case 'how-to-play':
                gameState = new GameHowToPlay();
                break;
        }
        gameState.setup();
    }
}

class GameTitle extends BaseGameScene {
    wrapper

    setup() {
        background(255);

        this.wrapper = createDiv();
        const wrapperWidth = Math.min(width * 0.9, 400);
        this.wrapper.size(wrapperWidth, height);
        this.wrapper.center();
        this.wrapper.class('menu-wrapper')

        const titleLogo = createImg('assets/title_logo.png', 'Colorful Drop Game');
        titleLogo.parent(this.wrapper);

        const buttonPlay = createButton('はじめる　');
        buttonPlay.class('menu-button icon-play');
        buttonPlay.parent(this.wrapper);
        buttonPlay.mouseReleased(() => {
            sounds.next.play();
            gameState.changeScene('level');
        });

        const buttonHowToPlay = createButton('あそびかた');
        buttonHowToPlay.class('menu-button icon-book');
        buttonHowToPlay.parent(this.wrapper);
        buttonHowToPlay.mouseReleased(() => {
            sounds.next.play();
            gameState.changeScene('how-to-play');
        });
    }

    teardown() {
        this.wrapper.remove();
    }
}

class GameSelectLevel extends BaseGameScene {
    wrapper

    setup() {
        this.wrapper = createDiv();
        const wrapperWidth = Math.min(width * 0.9, 400);
        this.wrapper.size(wrapperWidth, height);
        this.wrapper.center();
        this.wrapper.class('menu-wrapper')

        const buttonEasy = createButton('かんたん　');
        buttonEasy.class('menu-button icon-easy');
        buttonEasy.parent(this.wrapper);
        buttonEasy.mouseReleased(() => {
            sounds.ok.play();
            sounds.ok.onended(() => {
                gameState.changeScene('play-easy');
            });
        });

        const buttonNormal = createButton('ふつう　　');
        buttonNormal.class('menu-button icon-normal');
        buttonNormal.parent(this.wrapper);
        buttonNormal.mouseReleased(() => {
            sounds.ok.play();
            sounds.ok.onended(() => {
                gameState.changeScene('play-normal');
            });
        });

        const buttonHard = createButton('むずかしい');
        buttonHard.class('menu-button icon-hard');
        buttonHard.parent(this.wrapper);
        buttonHard.mouseReleased(() => {
            sounds.ok.play();
            sounds.ok.onended(() => {
                gameState.changeScene('play-hard');
            });
        });

        const buttonReturn = createButton('もどる');
        buttonReturn.class('menu-button menu-button-small icon-return');
        buttonReturn.parent(this.wrapper);
        buttonReturn.mouseReleased(() => {
            sounds.prev.play();
            gameState.changeScene('title');
        });
    }

    teardown() {
        this.wrapper.remove();
    }
}

class GamePlay extends BaseGameScene {
    level;
    imgBg;
    scaleScheduler;
    fieldSize;
    fieldDiameter;
    fields = [];
    adjacencyMatrix = [];
    groups = [];
    fieldAngle = 0;
    ball;
    accelerate;
    colorPalette;
    buttonRotateLeft;
    buttonRotateRight;
    flagStartFrame = 'before';
    timeStart;

    constructor(level) {
        super();
        this.level = level;
    }

    setup() {
        sounds.start.play();
        sounds.music.loop();

        matter.init();
        matter.zeroGravity();

        this.fieldDiameter = Math.floor(Math.min(windowWidth, windowHeight) / 5);
        const ballDiameter = Math.floor(this.fieldDiameter * 0.8);

        this.setupColorPalette(this.level);
        this.generateField(this.level, this.fieldDiameter);
        this.calcAdjacencyMatrix(this.fields.length);
        this.groupingField(2, 3);
        this.updateGroup();

        this.ball = new Ball(0, 0, ballDiameter, this.groups[0]);
        this.accelerate = new Accelerate(2e-6, 7e-5);

        this.scaleScheduler = new ScaleScheduler(0.25, 1.00, 500, 1e-3);

        this.buttonRotateLeft = new MomentaryButton();
        this.buttonRotateLeft.class('rotate-button rotate-button-left');
        this.buttonRotateRight = new MomentaryButton();
        this.buttonRotateRight.class('rotate-button rotate-button-right');

        this.wrapper = createDiv();
        const wrapperWidth = Math.min(width * 0.9, 400);
        this.wrapper.size(wrapperWidth, height);
        this.wrapper.center();
        this.wrapper.class('menu-wrapper')

        const text = createP('START');
        text.class('start-text');
        text.parent(this.wrapper);
    }

    draw() {
        this.updateCapture();
        this.drawBackground(0, 0, width, height);
        this.updateBallColor();

        if (this.flagStartFrame === 'before') {
            push();
            {
                translate(width / 2, height / 2);
                this.scaleScheduler.update();
                this.drawField();
                this.ball.draw();
            }
            pop();

            if (this.scaleScheduler.completed()) {
                this.flagStartFrame = 'current';
            }
        }
        else if (this.flagStartFrame === 'current') {
            this.timeStart = millis();
            this.wrapper.remove();

            this.flagStartFrame = 'after';
        }

        if (this.flagStartFrame === 'current' || this.flagStartFrame === 'after') {
            this.checkColor();
            this.updateGroup();
            this.updateFieldAngle();
            this.updateGravity(this.fieldAngle);

            push();
            {
                const ballX = this.ball.getPositionX() * Math.cos(this.fieldAngle) - this.ball.getPositionY() * Math.sin(this.fieldAngle);
                const ballY = this.ball.getPositionX() * Math.sin(this.fieldAngle) + this.ball.getPositionY() * Math.cos(this.fieldAngle);
                translate(-ballX, -ballY);

                push();
                {
                    translate(width / 2, height / 2);
                    rotate(this.fieldAngle);
                    this.drawField();
                    this.ball.draw();
                }
                pop();
            }
            pop();

            this.checkClear();
        }
    }

    teardown() {
        sounds.music.stop();

        for (let i = 0; i < this.fields.length; i++) {
            matter.forget(this.fields[i]);
        }
        matter.forget(this.ball);

        this.buttonRotateLeft.remove();
        this.buttonRotateRight.remove();
    }

    setupColorPalette(level) {
        let hueList
        switch (level) {
            case 'easy':
                hueList = [0, 25, 50, 125, 200, 230, 330];
                this.colorPalette = [...Array(1000).keys()].map((d) => {
                    const color = new Color();
                    const hue = hueList[randint(0, hueList.length - 1)];
                    color.setColor([hue, 50, 80]);
                    return color;
                });
                break;
            case 'normal':
            case 'hard':
                this.colorPalette = [...Array(1000).keys()].map((d) => {
                    const color = new Color();
                    const hue = randint(0, 359);
                    color.setColor([hue, 50, 80]);
                    return color;
                });
                this.colorPalette = [...Array(1000).keys()].map((d) => {
                    const color = new Color();
                    const hue = randint(0, 359);
                    color.setColor([hue, 50, 80]);
                    return color;
                });
                break;
            default:
                console.assert(`Invalid level: ${level}`)
                break;
        }
        this.colorPalette = ['dummy', ...this.colorPalette]
    }

    generateField(level, diameter) {
        switch (level) {
            case 'easy':
                this.fieldSize = 6;
                break;
            case 'normal':
                this.fieldSize = 8;
                break;
            case 'hard':
                this.fieldSize = 10;
                break;
            default:
                console.assert(`Invalid level: ${level}`)
                break;
        }

        const distance = diameter * (Math.sqrt(3) / 2);
        this.fields.push(matter.makeHexagon(0, 0, diameter));
        for (let i = 1; i <= this.fieldSize; i++) {
            const angle = TWO_PI / 6;
            for (let a = 0; a < TWO_PI - 1e-5; a += angle) {
                for (let j = 0; j < i; j++) {
                    const x = cos(a) * i * distance + cos(a + TWO_PI / 3) * j * distance;
                    const y = sin(a) * i * distance + sin(a + TWO_PI / 3) * j * distance;
                    this.fields.push(matter.makeHexagon(x, y, diameter));
                }
            }
        }
    }

    calcAdjacencyMatrix(len) {
        for (let i = 0; i < len; i++) {
            this.adjacencyMatrix[i] = new Set();
        }
        for (let i = 0; i < len; i++) {
            // 隣接する自身より大きいインデックス番号をSetに追加していく
            if (i === 0) {
                this.adjacencyMatrix[i] = this.adjacencyMatrix[i].union([1, 2, 3, 4, 5, 6]);
            }
            else {
                const numCircle = Math.ceil((-1 + Math.sqrt(1 + (4 / 3) * i)) / 2);  // 中心から何周目のループか
                // その周の最後のインデックス以外は、+1したインデックスと隣接する
                if (i !== 3 * numCircle * (numCircle + 1)) {
                    this.adjacencyMatrix[i].add(i + 1);
                }
                // その周の最初のインデックスと右上のインデックスとの隣接
                if (i === 3 * (numCircle - 1) * numCircle + 1) {
                    const idx = i + 12 * numCircle + 5;
                    if (idx < len) {
                        this.adjacencyMatrix[i].add(idx);
                    }
                }
                // より外側のインデックス（同じ周の最初と最後の関係を含む）との隣接関係を求める
                const cornerIdx = i - (i - 1) % numCircle;  // 直近の角のインデックス
                const cornerNum = (cornerIdx - (3 * numCircle * (numCircle - 1) + 1)) / numCircle;  // 何番目の角(0-5)のグループか
                const tmp = ((cornerIdx - 1) / numCircle - cornerNum) / 3;
                const l = 3 * (tmp + 1) * (tmp + 2) + (numCircle + 1) * cornerNum;
                let idxs;
                if ((i - 1) % numCircle === 0) {
                    // 六角形の角のとき
                    idxs = [l, l + 1, l + 2];
                }
                else {
                    // 六角形の角以外のとき
                    const m = l + (i - 1) % numCircle + 1
                    idxs = [m, m + 1];
                }
                idxs = idxs.filter(idx => idx < len);
                this.adjacencyMatrix[i] = this.adjacencyMatrix[i].union(idxs);
            }
        }

        // 逆方向（インデックスの大きい方から小さい方）への接続
        for (let i = 0; i < len; i++) {
            for (const j of this.adjacencyMatrix[i]) {
                this.adjacencyMatrix[j].add(i);
            }
        }
    }

    groupingField(minSize, maxSize) {
        // グループ番号を初期化
        for (let i = 0; i < this.fields.length; i++) {
            this.groups[i] = 0;
        }

        // グルーピング処理
        const tmpAdjacencyMatrix = [...this.adjacencyMatrix];  // Shallow copy
        let groupId = -1;
        let candidateIdxs = [0];  // 初回はインデックス0（中心）から開始
        while (candidateIdxs.length > 0) {
            const size = randint(minSize, maxSize);
            let idx;
            let idxPool = new Set([candidateIdxs[randint(0, candidateIdxs.length - 1)]]);
            const idxSelected = [];
            while (idxPool.size !== 0 && idxSelected.length < size) {
                // idxPoolの中からランダムに次のインデックスを選択
                // 選択したインデックスを、idxPoolから取り除きidxSelectedに追加
                idx = [...idxPool][randint(0, idxPool.size - 1)];
                idxPool = idxPool.difference([idx]);
                idxSelected.push(idx);
                // 選択したインデックスに隣接するインデックスを、次の候補としてidxPoolに追加
                idxPool = idxPool.union(tmpAdjacencyMatrix[idx]);
                // 隣接行列の更新（選択したインデックスとのエッジを削除）
                for (const i of tmpAdjacencyMatrix[idx]) {
                    tmpAdjacencyMatrix[i] = tmpAdjacencyMatrix[i].difference([idx]);
                }
                tmpAdjacencyMatrix[idx] = new Set();
            }

            // 作成したグループをgroupsに記録
            for (const idx of idxSelected) {
                this.groups[idx] = groupId;
            }

            // グループ番号を更新
            groupId--;
            // グループに未割当のインデックスを候補として抽出
            candidateIdxs = [];
            this.groups.filter((value, index) => { if (value === 0) candidateIdxs.push(index) });
        }

        // minSize未満の端数グループの処理
        // 隣接するグループのうち最もサイズの小さいグループに統合する
        // これによりmaxSizeを超える可能性あり
        const groupingById = {};
        for (let idx = 0; idx < this.groups.length; idx++) {
            if (!(this.groups[idx] in groupingById)) {
                groupingById[this.groups[idx]] = [];
            }
            groupingById[this.groups[idx]].push(idx);
        }
        for (const id in groupingById) {
            if (groupingById[id].length < minSize) {
                // グループに隣接するインデックスを求める
                let adjacentIdxs = new Set();
                for (const idx of groupingById[id]) {
                    adjacentIdxs = adjacentIdxs.union(this.adjacencyMatrix[idx]);
                }
                adjacentIdxs = adjacentIdxs.difference(groupingById[id]);
                adjacentIdxs = Array.from(adjacentIdxs)
                // 隣接するグループのうち最もサイズの小さいグループを求める
                const adjacentGroupSize = adjacentIdxs.map(idx => groupingById[this.groups[idx]].length)
                const newGroupId = this.groups[adjacentIdxs[adjacentGroupSize.indexOf(Math.min(...adjacentGroupSize))]];
                // グループ番号の更新
                for (const idx of groupingById[id]) {
                    this.groups[idx] = newGroupId;
                }
            }
        }
    }

    updateGroup() {
        for (let i = 0; i < this.fields.length; i++) {
            this.fields[i].body.collisionFilter.group = this.groups[i];
        }
    }

    updateFieldAngle() {
        if (this.buttonRotateLeft.isPressed) {
            this.accelerate.accelerateMinus();
        }
        else if (this.buttonRotateRight.isPressed) {
            this.accelerate.acceleratePlus();
        }
        else {
            this.accelerate.decelerate();
        }

        const velocity = this.accelerate.getAccelerate() * deltaTime;
        this.fieldAngle += velocity * deltaTime;

        if (this.fieldAngle < 0) {
            this.fieldAngle += TWO_PI;
        }
        else if (this.fieldAngle >= TWO_PI) {
            this.fieldAngle -= TWO_PI;
        }
    }

    updateGravity(radian) {
        const gx = Math.sin(radian);
        const gy = Math.cos(radian);
        matter.changeGravity(gx, gy);
    }

    checkColor() {
        // ボールから最も近いfiledを求める
        let minDist = Math.max(width, height) ** 2;
        let minDistIdx = -1;
        const ballX = this.ball.getPositionX();
        const ballY = this.ball.getPositionY();
        for (let i = 0; i < this.fields.length; i++) {
            const fieldX = this.fields[i].getPositionX();
            const fieldY = this.fields[i].getPositionY();
            const distance = (ballX - fieldX) ** 2 + (ballY - fieldY) ** 2;
            if (distance < minDist) {
                minDist = distance;
                minDistIdx = i;
            }
        }
        console.assert(minDistIdx >= 0);

        // そのフィールドと隣接するグループを求める
        let adjacentGroups = new Set();
        for (const adjacentIdx of this.adjacencyMatrix[minDistIdx]) {
            adjacentGroups = adjacentGroups.union([this.groups[adjacentIdx]]);
        }
        adjacentGroups = adjacentGroups.difference([this.groups[minDistIdx]]);  // 自身と同じグループは除く
        adjacentGroups = Array.from(adjacentGroups);

        // 隣接グループと背景の色相を比較する
        for (let group of adjacentGroups) {
            let diffColor = Math.abs(this.colorPalette[-group].getH() - this.ball.color.getH());
            diffColor = Math.min(diffColor, 360 - diffColor);
            if (diffColor <= 30 && this.ball.color.getS() >= 80) {
                // 色相の近さが閾値を下回った場合、そのグループのフィールドを背景化する
                for (let i = 0; i < this.groups.length; i++) {
                    if (this.groups[i] === group) {
                        this.groups[i] = this.ball.group;
                        sounds.drop.play();
                    }
                }
            }
        }
    }

    updateCapture() {
        this.imgBg = capture.get();
    }

    drawBackground(left, top, right, bottom) {
        // background(this.colorPalette[Math.floor(frameCount / 60) % (this.colorPalette.length - 1) + 1].getColor());
        image(this.imgBg, left, top, right - left, bottom - top);
    }

    updateBallColor() {
        const pickXNum = 25;
        const pickYNum = 25;
        const sparse = 2;

        let pickX, pickY;
        const center_x = Math.floor(pickXNum / 2);
        const center_y = Math.floor(pickYNum / 2);
        let r = 0, g = 0, b = 0;
        let _r, _g, _b, _a, h, s, v;
        for (let y = 0; y < pickYNum; y++) {
            for (let x = 0; x < pickXNum; x++) {
                pickX = width / 2 + (x - center_x) * sparse;
                pickY = height / 2 + (y - center_y) * sparse;
                pickX = clip(pickX, 0, width - 1);
                pickY = clip(pickY, 0, height - 1);
                [_r, _g, _b, _a] = get(pickX, pickY);
                r += _r;
                g += _g;
                b += _b;
            }
        }
        r /= pickXNum * pickYNum;
        g /= pickXNum * pickYNum;
        b /= pickXNum * pickYNum;
        [h, s, v] = rgb2hsv(r, g, b);
        this.ball.color = s >= 80 ? [h, 80, 100, 255] : [0, 0, 255, 0];
    }

    drawField() {
        stroke(255);
        strokeWeight(1);
        for (let i = 0; i < this.groups.length; i++) {
            if (this.groups[i] != -1) {
                fill(this.colorPalette[-this.groups[i]].getColor());
                this.fields[i].freeze();
                this.fields[i].show();
            }
        }
    }

    checkClear() {
        const ballX = this.ball.getPositionX();
        const ballY = this.ball.getPositionY();
        const threshold = this.fieldDiameter * this.fieldSize;
        if (ballX ** 2 + ballY ** 2 >= threshold ** 2) {
            time = millis() - this.timeStart;
            gameState.changeScene('clear');
        }
    }
}

class GameClear extends BaseGameScene {
    wrapper

    setup() {
        background(0, 0.5);

        sounds.finish.play();

        this.wrapper = createDiv();
        const wrapperWidth = Math.min(width * 0.9, 400);
        this.wrapper.size(wrapperWidth, height);
        this.wrapper.center();
        this.wrapper.class('menu-wrapper')

        const text = createP('CLEAR');
        text.class('clear-text');
        text.parent(this.wrapper);

        const textTime = createP(`TIME: ${timeToStr(time)}`);
        textTime.class('clear-time');
        textTime.parent(this.wrapper);

        const buttonReturn = createButton('タイトルへもどる');
        buttonReturn.class('menu-button icon-return');
        buttonReturn.parent(this.wrapper);
        buttonReturn.mouseReleased(() => {
            sounds.next.play();
            gameState.changeScene('title');
        });
    }

    teardown() {
        this.wrapper.remove();
        clear();
    }
}

class GameHowToPlay extends BaseGameScene {
    wrapper

    setup() {
        this.wrapper = createDiv();
        const wrapperWidth = Math.min(width * 0.9, 400);
        this.wrapper.size(wrapperWidth, height);
        this.wrapper.center();
        this.wrapper.class('menu-wrapper')

        const stepsWrapper = createElement('ol');
        stepsWrapper.class('how-to-play-steps')
        const step1 = createElement('li', '身の周りにあるものをカメラで映して真ん中のドロップをカラフルに染めよう');
        const step2 = createElement('li', '真ん中のドロップを隣接するドロップと同じ色に染めると、隣接するドロップを消せるよ');
        const step3 = createElement('li', 'フィールドの回転を上手く活用して、一番外側まで辿り着いたらクリア！');
        step1.parent(stepsWrapper);
        step2.parent(stepsWrapper);
        step3.parent(stepsWrapper);
        stepsWrapper.parent(this.wrapper);

        const buttonReturn = createButton('もどる');
        buttonReturn.class('menu-button menu-button-small icon-return');
        buttonReturn.parent(this.wrapper);
        buttonReturn.mouseReleased(() => {
            sounds.prev.play();
            gameState.changeScene('title');
        });
    }

    teardown() {
        this.wrapper.remove();
    }
}
