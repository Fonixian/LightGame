const gameContainer = document.querySelector('#gameContainer');

// R = row count, C = col count, S = new row, T + num = tiles, W = wall, W + num = checked wall, B = lightspot
const baseMaps = [  ["R7C7ST3W1T3ST1W0T3W2T1ST7SWT2WT2WST7ST1WT3W2T1ST3W3T3","Easy"],
                    ["R7C7ST2W0T1WT2ST7SWT1WT1W3T1WST3W1T3SW2T1WT1WT1WST7ST2WT1W2T2","Medium"],
                    ["R10C10ST1WT8ST5W3T1W2T1WST1W0WT4WT2ST4WT5ST1W1T2WW1WT3ST3WWWT2W3T1ST5WT4ST2W1T4W0WT1SW3T1WT1W0T5ST8W0T1","Hard"]];
let customMaps = [];
let baseName = "Wanderer";

let currentGame;
let gameMenu;
let menuButton;
let gameHistory;
let mapSelector;
let editorSelector;
let editor;

class boardSize{
    constructor(boardBlocks,maxCol,maxRow){
        this.boardBlocks = boardBlocks;
        this.maxCol = maxCol;
        this.maxRow = maxRow;
    }
}
class runningGame{
    constructor(board,array,maxCol,maxRow,running,victory,mapName,playerName,timer,time,cycle){
        this.board = board;
        this.array = array;
        this.maxCol = maxCol;
        this.maxRow = maxRow;
        this.running = running;
        this.victory = victory;
        this.mapName = mapName;
        this.playerName = playerName;
        this.timer = timer;
        this.time = time;
        this.cycle = cycle;
    }
}

function makeBoard(map){
    let board = document.createElement('table');

    const strIter = iteratorPlus(map[Symbol.iterator]());
    let rowCounter = 0;
    let colCounter = 0;
    let maxRow = 0;
    let maxCol = 0;
    let currRow;

    toBeClicked = [];
    boardElements = [];

    
    let current = strIter.first();
    if(current.type === 'R' && !isNaN(current.value)){
        maxRow = +(current.value);
    }else{
        console.log("Failed to load");
    }
    current = strIter.next();
    if(current.type === 'C' && !isNaN(current.value)){
        maxCol = +(current.value);
    }else{
        console.log("Failed to load");
    }
    
    let boardInfo = new boardSize(boardElements,maxCol,maxRow);
    while(!current.done){
        current = strIter.next();
        switch(current.type){
            case('S'):
                colCounter = 0;
                rowCounter++;
                if(rowCounter > maxRow)console.log("Failed to load")/*TODO fail*/;
                currRow = initRow(board);
                break;
            case('T'):
                if(!isNaN(current.value)){
                    colCounter += +(current.value);
                    if(colCounter > maxCol)console.log("Failed to load")/*TODO fail*/;
                    let tiles = createTiles(currRow,+(current.value));
                    tiles.forEach(t => boardElements.push(t));
                }
                break;
            case('W'):
                if(isNaN(current.value)){
                    colCounter++;
                    if(colCounter > maxCol)console.log("Failed to load")/*TODO fail*/;
                    boardElements.push(createWall(currRow));
                }else{
                    colCounter++;
                    if(colCounter > maxCol || +(current.value) > 4)console.log("Failed to load")/*TODO fail*/;
                    boardElements.push(createCheckedWall(currRow,+(current.value),boardInfo));
                }
                break;
            case('B'):
                let tile = createLightTile(currRow);
                toBeClicked.push(tile);
                boardElements.push(tile);
                break;
            default:
                /*TODO fail*/
        }
    }

    return [board,maxCol,maxRow,boardElements,toBeClicked];
}

function initWave(boardBlocks,value,delay,col,row,maxCol,maxRow,x,y){
    function wave(interval){
        let indx = row * maxCol + col;
        let valid = 0 <= row && row < maxRow && 0 <= col && col < maxCol;

        if(!valid || !boardBlocks[indx].flood(value)){
            clearInterval(interval);
        }
        row += y;
        col += x;
    }
    let interval = setInterval(function(){wave(interval)},delay)
}

class Base{
    click(){return NaN;}
    flood(value){return false;}
    ok(){return true;}
    isTile(){return false;}
    isWall(){return false;}
    constructor(){}
}

class Tile extends Base{
    constructor(element,light,lit){
        super();
        this.element = element;
        this.light = light;
        this.lit = lit;
        this.valid = true;
        this.value = 0;
    }
    isTile(){return true;}
    click(){
        this.light = !this.light;
        (this.light)?(this.value++):(this.value--);

        if(this.light){
            this.element.innerHTML = "★";
        }else{
            this.element.innerHTML = " ";
        }

        if(this.value > 0){
            this.element.classList.add('lit');
        }else{
            this.element.classList.remove('lit');
        }

        if(this.light && this.value > 1){
            this.element.classList.add('invalid');
            this.valid = false;
        }else{
            this.element.classList.remove('invalid');
            this.valid = true;
        }

        return (this.light)?(1):(-1);
    }
    flood(value){
        this.value += value;
        if(this.value > 0){
            this.element.classList.add('lit');
        }else{
            this.element.classList.remove('lit');
        }

        if(this.light && this.value > 1){
            this.element.classList.add('invalid');
            this.valid = false;
        }else{
            this.element.classList.remove('invalid');
            this.valid = true;
        }

        return true;
    }
    ok(){
        return this.valid && this.value > 0;
    }
    toMorph(){
        return new Morph(this.element);
    }
}

class Wall extends Base{
    constructor(element){
        super();
        this.element = element;
        this.value = -1;
    }
    isWall(){return true;}
    toMorph(){
        return new Morph(this.element,true);
    }
}

class CheckedWall extends Base{
    constructor(element,value,boardInfo){
        super();
        this.element = element;
        this.value = value;
        this.neighbours = 0;
        this.boardInfo = boardInfo;
    }
    checkLight(col,row){
        let val = 0;
        let valid = 0 <= row && row < this.boardInfo.maxRow && 0 <= col && col < this.boardInfo.maxCol;
        if(valid){
            let indx = row * this.boardInfo.maxCol + col;
            if(this.boardInfo.boardBlocks[indx].isTile() && this.boardInfo.boardBlocks[indx].light)val = 1;
        }
        return val;
    }
    isWall(){return true;}
    flood(value){
        let row = this.element.parentElement.rowIndex;
        let col = this.element.cellIndex;
        this.neighbours = 0;
        this.neighbours += this.checkLight(col + 1,row    );
        this.neighbours += this.checkLight(col - 1,row    );
        this.neighbours += this.checkLight(col    ,row + 1);
        this.neighbours += this.checkLight(col    ,row - 1);

        if(this.neighbours > this.value){
            this.element.classList.add('invalid');
        }else{
            this.element.classList.remove('invalid');
        }
        if(this.neighbours == this.value){
            this.element.classList.add('valid');
        }else{
            this.element.classList.remove('valid');
        }

        return false;
    }
    ok(){
        return this.neighbours == this.value;
    }
    toMorph(){
        return new Morph(this.element,true,this.value);
    }
}

class Morph{
    constructor(element,isWall = false,value = -1){
        this.element = element;
        this.isWall = isWall;
        this.value = value;
        if(this.isWall){
            this.element.classList.add('wall');
            if(this.value != -1){
                this.element.innerHTML = `<input type="number" value="${value}">`
            }else{
                this.element.innerHTML = `<input type="number" value="">`
            }
        }
    }
    click(){
        if(!this.isWall){
            this.element.innerHTML = `<input type="number" value="">`;
            this.element.classList.add('wall');
            this.element.firstElementChild.addEventListener('input',(event)=>{
                let validVlaue = valideInput(this.element.firstElementChild.value,0,4);
                this.element.firstElementChild.value = validVlaue
                this.value = validVlaue;
            })
            this.element.firstElementChild.focus();
            this.isWall = true;
            this.value = -1;
        }else{
            this.element.innerHTML = ''
            this.element.classList.remove('wall')
            this.isWall = false;
            this.value = -1;
        }
    }
    isTile(){
        return !this.isWall;
    }
}

function valideInput(value,min,max){
    if(value){
        if(value < min)value = min;
        if(value > max)value = max;
    }
    return value
}

function iteratorPlus(strIter){
    const iter = strIter;
    let typeValueDone;
    let nextChar;
    const iterator = {
        first(){
            let type = (strIter.next()).value;
            let number = '';
            nextChar = strIter.next();

            while(!nextChar.done && !isNaN(nextChar.value)){
                number = number.concat(nextChar.value);
                nextChar = strIter.next();
            }
            typeValueDone = {type: type, value: (number === '')?(NaN):(number), done: nextChar.done};
            return typeValueDone;
        },
        next(){
            let type = nextChar.value;
            let number = '';
            nextChar = strIter.next();

            while(!nextChar.done && !isNaN(nextChar.value)){
                number = number.concat(nextChar.value);
                nextChar = strIter.next();
            }
            typeValueDone = {type: type, value: (number === '')?(NaN):(number), done: nextChar.done};
            return typeValueDone;
        },
        current(){
            return typeValueDone;
        }
    }
    return iterator;
}

function initRow(board){
    let row = document.createElement('tr');
    board.appendChild(row);
    return row;
}

function createTiles(row,count){
    let tiles = [];
    for(let i = 0; i < count; i++){
        const tile = document.createElement('td');
        tile.innerHTML = " ";
        row.appendChild(tile);
        tiles.push(new Tile(tile,false,false));
    }
    return tiles;
}

function createLightTile(row){
    const tile = document.createElement('td');
    tile.innerHTML = " ";
    row.appendChild(tile);
    return new Tile(tile,false,false);
}

function createCheckedWall(row,value,boardSize){
    const cWall = document.createElement('td');
    cWall.innerHTML = `${value}`;
    cWall.classList.add('wall');
    //if(start)boardBlocks.push(new CheckedWall(cWall,value));
    row.appendChild(cWall);
    return new CheckedWall(cWall,value,boardSize);
}

function createWall(row){
    const wall = document.createElement('td');
    wall.classList.add('wall')
    //if(start)boardBlocks.push(new Wall(wall));
    row.appendChild(wall);
    return new Wall(wall);
}

function makeGameBoard(map,mapName,playerName,baseTime){
    //[board,maxCol,maxRow,boardElements,toBeClicked]
    let BCRETC = makeBoard(map);
    let board = BCRETC[0];
    let maxCol = BCRETC[1],maxRow = BCRETC[2];
    let boardElements = BCRETC[3];
    let toBeClicked = BCRETC[4];

    let boardInfo = new boardSize(boardElements,maxCol,maxRow);

    let timer = document.createElement('caption');
    timer.innerHTML = "0 s";
    board.appendChild(timer);

    let startTime = Math.floor(Date.now() / 10) - baseTime;

    let runningObj = {
        running : false
    }
    let timeObj = {
        time : 0
    };
    cycle = setInterval(function(){
        if(runningObj.running){
            //Over,lighted,maxLighted
            let OLM = boardElements.reduce((prev,curr)=>[
                    prev[0] && curr.ok(),
                    (curr.isTile() && curr.value > 0)?(prev[1] += 1.):(prev[1] += 0.),
                    (curr.isTile())?(prev[2] += 1.):(prev[2] += 0.)],[true,0.,0.]);
            
            gameContainer.style.background = `radial-gradient(circle, rgba(245, 245, 220, 1) ${OLM[1] / OLM[2] * 100.0}%, rgba(195, 195, 170, 1) 100%)`;
            timeObj.time = Math.floor(Date.now() / 10 - startTime) / 100;
            timer.innerHTML = `${timeObj.time} s`;

            if(OLM[0]){
                runningObj.running = false;
                victory = true;
                clearInterval(cycle);
                timer.innerHTML = `Congratulations ${playerName}, final time is ${timeObj.time} s`;
                localStorage.removeItem('lastSession');
                let history = localStorage.getItem('gameHistory');
                if(history){
                    historyList = JSON.parse(history);
                    historyList.unshift([playerName,mapName,timeObj.time]);
                    localStorage.setItem('gameHistory',JSON.stringify(historyList));
                }else{
                    historyList = [[playerName,mapName,timeObj.time]];
                    localStorage.setItem('gameHistory',JSON.stringify(historyList));
                }
            }
        }
    },100)

    board.addEventListener('click',(event)=>{
        if(event.target.matches('td') && runningObj.running){
            let row = event.target.parentElement.rowIndex;
            let col = event.target.cellIndex;
            let indx = row * maxCol + col;
            let val = boardElements[indx].click();
            if(!isNaN(val)){
                initWave(boardElements, val, 100, col + 1, row    , maxCol, maxRow, 1, 0)
                initWave(boardElements, val, 100, col - 1, row    , maxCol, maxRow,-1, 0)
                initWave(boardElements, val, 100, col    , row + 1, maxCol, maxRow, 0, 1)
                initWave(boardElements, val, 100, col    , row - 1, maxCol, maxRow, 0,-1)
            }
        }
    })

    toBeClicked.forEach((t)=>{
        let row = t.element.parentElement.rowIndex;
        let col = t.element.cellIndex;
        let indx = row * maxCol + col;
        let val = boardElements[indx].click();
        if(!isNaN(val)){
            initWave(boardElements, val, 100, col + 1, row    , maxCol, maxRow, 1, 0)
            initWave(boardElements, val, 100, col - 1, row    , maxCol, maxRow,-1, 0)
            initWave(boardElements, val, 100, col    , row + 1, maxCol, maxRow, 0, 1)
            initWave(boardElements, val, 100, col    , row - 1, maxCol, maxRow, 0,-1)
        }
    })

    runningObj.running = true;

    gameContainer.appendChild(board);

    board.classList.add('board');
    let width = board.offsetWidth;
    board.style.left = `calc(50% - ${width / 2.}px)`;

    return new runningGame(board,boardElements,maxCol,maxRow,runningObj,false,mapName,playerName,timer,timeObj,cycle)
}

function stringifyBoard(boardElements,maxRow,maxCol){
    let counter = 0;
    let state = `R${maxRow}C${maxCol}`;
    for(let i = 0; i < maxRow; i++){
        state = state + 'S';
        for(let j = 0; j < maxCol; j++){
            indx = i * maxCol + j;
            if(boardElements[indx].isTile()){
                if(boardElements[indx].light){
                    if(counter > 0){
                        state = state + `T${counter}B`;
                        counter = 0;
                    }else{
                        state = state + 'B';
                    }
                }else{
                    counter++;
                }
            }else{
                let value = boardElements[indx].value;
                if(value == -1){
                    if(counter > 0){
                        state = state + `T${counter}W`;
                        counter = 0;
                    }else{
                        state = state + 'W';
                    }
                }else{
                    if(counter > 0){
                        state = state + `T${counter}W${value}`;
                        counter = 0;
                    }else{
                        state = state + `W${value}`;
                    }
                }
            }
        }
        if(counter > 0){
            state = state + `T${counter}`;
            counter = 0;
        }
    }
    if(counter > 0){
        state = state + `T${counter}`;
    }

    return state;
}

function saveState(runningGame){
    if(!runningGame.victory){
        let state = stringifyBoard(runningGame.array,runningGame.maxRow,runningGame.maxCol);
        localStorage.setItem('lastSession',JSON.stringify([state,runningGame.time.time * 100,runningGame.mapName,runningGame.playerName]));
    }else{
        localStorage.removeItem('lastSession');
    }
}

function makePreview(map,nameSelector){
    //[board,maxCol,maxRow,boardElements,toBeClicked]
    let BCRETC = makeBoard(map[0]);
    let board = BCRETC[0];
    board.classList.add('preview');

    let nametag = document.createElement('caption');
    nametag.innerHTML = map[1];
    board.appendChild(nametag);

    board.addEventListener('click',(event)=>{
        mapSelector.classList.add('hidden');
        let playerName = nameSelector.value;
        currentGame = makeGameBoard(map[0],map[1],playerName,0);
    })

    return board;
}

function initMapSelector(){
    mapSelector = document.createElement('div');
    mapSelector.classList.add('selector');

    let nameSelector = document.createElement('input','type = "text"');
    nameSelector.value = baseName;
    mapSelector.appendChild(nameSelector);

    maps = document.createElement('div');
    maps.classList.add('row');

    baseMaps.forEach(map => maps.appendChild(makePreview(map,nameSelector)));
    mapSelector.appendChild(maps);

    let otherMaps = localStorage.getItem('gameCustom');
    if(otherMaps != null){
        otherMaps = JSON.parse(otherMaps);
        otherMaps.forEach(map => maps.appendChild(makePreview(map,nameSelector)));
        mapSelector.appendChild(maps);
    }

    gameContainer.appendChild(mapSelector);
}

function initHistory(){
    let history = localStorage.getItem('gameHistory');
    gameHistory = document.createElement('ul');
    gameHistory.classList.add('gameMenu');
    if(history){
        //[[player,map,time],...]
        historyList = JSON.parse(history);
        historyList.forEach((PNT)=>{
            let row = document.createElement('li');
            row.classList.add('row');
            let name,map,time;
            name = document.createElement('div');
            name.innerHTML =PNT[0];
            row.appendChild(name);
            map = document.createElement('div');
            map.innerHTML = PNT[1];
            row.appendChild(map);
            time = document.createElement('div');
            time.innerHTML = PNT[2];
            row.appendChild(time);
            gameHistory.appendChild(row);
        })
    }else{
        let row = document.createElement('li');
        row.innerHTML = "Empty";
        gameHistory.appendChild(row);
    }
    gameContainer.appendChild(gameHistory);
}

function initEditor(map = 'R1C4ST3W1', name = ''){
    //[board,maxCol,maxRow,boardElements,toBeClicked]
    let BCRETC = makeBoard(map);
    let board = BCRETC[0];
    board.classList.add('board');
    
    let maxCol = BCRETC[1],maxRow = BCRETC[2];
    let boardElements = BCRETC[3].map(e => e.toMorph());

    let toolbar = document.getElementById('editorToolBar').cloneNode(true);
    board.appendChild(toolbar);
    toolbar.classList.remove('hidden');

    let nameSelector = toolbar.children[0].children[1];
    nameSelector.value = name;
    let colSelector = toolbar.children[1].children[1];
    colSelector.value = maxCol;
    let rowSelector = toolbar.children[2].children[1];
    rowSelector.value = maxRow;
    let saveButton = toolbar.children[3].children[0];
    let discardButton = toolbar.children[3].children[1];

    nameSelector.addEventListener('input',(event)=>{
        name = nameSelector.value;
    })

    colSelector.addEventListener('input',(event)=>{
        maxCol = colSelector.value;
        maxRow = rowSelector.value;
        let newMap = `R${maxRow}C${maxCol}`;
        for(let i = 0; i < maxRow; i++){
            newMap = newMap.concat(`ST${maxCol}`)
        }
        board.remove()
        initEditor(newMap,name)
    })

    rowSelector.addEventListener('input',(event)=>{
        maxCol = colSelector.value;
        maxRow = rowSelector.value;
        let newMap = `R${maxRow}C${maxCol}`;
        for(let i = 0; i < maxRow; i++){
            newMap = newMap.concat(`ST${maxCol}`)
        }
        board.remove()
        initEditor(newMap,name)
    })

    board.addEventListener('click',(event)=>{
        if(event.target.matches('td')){
            let row = event.target.parentElement.rowIndex;
            let col = event.target.cellIndex;
            let indx = row * maxCol + col;
            boardElements[indx].click();
        }
        if(event.target.matches('td > input')){
            let row = event.target.parentElement.parentElement.rowIndex;
            let col = event.target.parentElement.cellIndex;
            let indx = row * maxCol + col;
            boardElements[indx].click();
        }
    })

    saveButton.addEventListener('click',(event)=>{
        let otherMaps = localStorage.getItem('gameCustom')
        let newMap = [stringifyBoard(boardElements,maxRow,maxCol),name]
        if(otherMaps != null){
            otherMaps = JSON.parse(otherMaps);
            otherMaps = otherMaps.filter(t => t[1] != name);
            otherMaps.push(newMap)
            localStorage.setItem('gameCustom',JSON.stringify(otherMaps));
        }else{
            localStorage.setItem('gameCustom',JSON.stringify([newMap]));
        }
    })

    discardButton.addEventListener('click',(event)=>{
        let otherMaps = localStorage.getItem('gameCustom')
        let newMap = [stringifyBoard(boardElements,maxRow,maxCol),name]
        if(otherMaps != null){
            otherMaps = JSON.parse(otherMaps);
            otherMaps = otherMaps.filter(t => t[1] != name);
            localStorage.setItem('gameCustom',JSON.stringify(otherMaps));
            board.remove();
            menuButton.classList.add('hidden');
            menu.classList.remove('hidden');
        }
    })
    
    gameContainer.append(board);

    let width = board.offsetWidth;
    board.style.left = `calc(50% - ${width / 2.}px)`;
    editor = board;
}

function initEditorSelector(){
    let customString = localStorage.getItem('gameCustom');
    editorSelector = document.createElement('ul');
    editorSelector.classList.add('gameMenu');
    if(customString){
        //[[map,mapname],...]
        customs = JSON.parse(customString);
        customs.forEach((NM)=>{
            let customMap = document.createElement('li');
            customMap.addEventListener('click',(event)=>{
                initEditor(NM[0],NM[1]);
                editorSelector.remove();
            })
            customMap.innerHTML = NM[1];
            editorSelector.appendChild(customMap);
        })
    }
    let newCustom =  document.createElement('li');
    newCustom.innerHTML = 'New custom map';
    newCustom.addEventListener('click',(event)=>{
        initEditor();
        editorSelector.remove();
    })
    editorSelector.appendChild(newCustom);

    gameContainer.appendChild(editorSelector);
}

function initMenu(){
    menu = document.createElement('ul');
    menu.classList.add('gameMenu');

    menuButton = document.createElement('div');
    
    let toContinue = document.createElement('li');
    let toNewGame = document.createElement('li');
    let toHistory = document.createElement('li');
    let toEditor = document.createElement('li');
    /*MENU--BUTTON-------------------------------------------------------*/
    menuButton.classList.add('menuButton');
    menuButton.innerHTML = "Menu";
    menuButton.addEventListener('click',(event)=>{
        menuButton.classList.add('hidden');
        menu.classList.remove('hidden');

        if(mapSelector){
            mapSelector.remove();
        }
        if(gameHistory){
            gameHistory.remove();
        }
        if(editor){
            editor.remove();
        }
        if(editorSelector){
            editorSelector.remove();
        }
        
        if(currentGame){
            if(currentGame.running.running){
                saveState(currentGame);
                let lastSession = JSON.parse(localStorage.getItem('lastSession'));
                baseName = lastSession[3];

                clearInterval(currentGame.cycle);
                currentGame.board.remove();
                currentGame = null;

                toContinue.innerHTML = `Continue as ${baseName}`;
                toContinue.classList.remove('hidden');
            }else{
                toContinue.classList.add('hidden');
                currentGame.board.remove();
                currentGame = null;
            }
        }
    })
    gameContainer.appendChild(menuButton);
    menuButton.classList.add('hidden');
    /*LAST--SESSION------------------------------------------------------*/
    let lastSession = localStorage.getItem('lastSession');
    if(!lastSession){
        toContinue.classList.add('hidden');
    }else{
        baseName = JSON.parse(lastSession)[3];
    }
    toContinue.innerHTML = `Continue as ${baseName}`;
    toContinue.addEventListener('click',(event)=>{
        menuButton.classList.remove('hidden');
        let lastSession = JSON.parse(localStorage.getItem('lastSession'));
        menu.classList.add('hidden');
        currentGame = makeGameBoard(lastSession[0],lastSession[2],lastSession[3],lastSession[1]);
        
    })
    menu.appendChild(toContinue);
    /*NEW--GAME----------------------------------------------------------*/
    toNewGame.innerHTML = "New Game";
    toNewGame.addEventListener('click',(event)=>{
        menuButton.classList.remove('hidden');
        menu.classList.toggle('hidden')
        initMapSelector(baseMaps);
    })
    menu.appendChild(toNewGame);
    /*HISTORY------------------------------------------------------------*/
    toHistory.innerHTML = "History";
    toHistory.addEventListener('click',(event)=>{
        menuButton.classList.remove('hidden');
        menu.classList.toggle('hidden')
        initHistory();
    })
    menu.appendChild(toHistory);
    /*EDITOR-------------------------------------------------------------*/
    toEditor.innerHTML = "Editor";
    toEditor.addEventListener('click',(event)=>{
        menuButton.classList.remove('hidden');
        menu.classList.toggle('hidden')
        initEditorSelector();
    })
    menu.appendChild(toEditor);

    return menu;
}

function initGame(){
    gameMenu = initMenu();
    gameContainer.appendChild(gameMenu);
}

initGame();