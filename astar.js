var north = 0;
var south = 1;
var east  = 2;
var west  = 3;

var northeast = 4;
var northwest = 5;
var southeast = 6;
var southwest = 7;

// are we allowed to move diagonally?
var diagonal = 0;

// the "cost" of one move
var move_weight = 1;

// the "attractiveness" of tiles closer to the target
var heuristic_weight = 5;

// size of the grid
var ncol = 50;
var nrow = 50;

/*
 * Astar Singleton
 */

function Astar() {
    self = this;
    this.openList = new Array();
    this.closedList = new Array();
    this.path = new Array();
};

Astar.prototype.player = null;
Astar.prototype.timer = null;
Astar.prototype.target = null;
Astar.prototype.cells = null;

var astar = new Astar();

Astar.prototype.beginPathing = function(target) {
    while (this.openList.length)
        this.openList.pop().destroy();
    while (this.closedList.length)
        this.closedList.pop().destroy();
    this.path.length = 0;

    this.target = target;

    this.openList.push(new Pathing(self.player.cell, null));
};

Astar.prototype.tick = function(self) {
    if ("target" in self)
    {
        if (self.openList.length)
        {
            var p = self.openList.shift();
            p.close();
            self.closedList.push(p);

            if (self.target.distanceFrom(p.cell) == 0)
            {
                while (self.openList.length)
                {
                    var q = self.openList.pop();
                    q.close();
                    self.closedList.push(q);
                }

                var q = self.target.pathing;
                while (!(q.cell === self.player.cell))
                {
                    self.path.push(q.cell);
                    q.cell.td.className = "path";
                    q.cell.td.style.backgroundColor = "";
                    q = q.parent;
                }

                return;
            }

            for (var i = 0; i < p.cell.neighbour.length; i++)
            {
                var q = p.cell.neighbour[i];
                if (q && !q.obstacle)
                {
                    if (q.pathing)
                    {
                        if ((p.move_cost + move_weight) < q.pathing.move_cost)
                        {
                            q.pathing.update_cost(p.move_cost + move_weight);
                            q.pathing.parent = p;
                            self.openList.sort(function(a, b) { return a.tot_cost - b.tot_cost });
                        }
                    }
                    else {
                        var g = new Pathing(q, p);

                        if (self.openList.length == 0)
                            self.openList.push(g);
                        else {
                            self.openList.splice(Math.abs(self.openList.binaryIndexOf(g)), 0, g);
                        }
                    }
                }
            }

            if (self.openList.length == 0)
                alert("Could not find path");
        }
        else if (self.path.length) {
            var q = self.path.pop();
            if (q)
                self.player.moveTo(q);
        }
    }
};

/*
 * AstarCell - encapsulates a tile and its metadata
 */

function AstarCell(x, y, td)
{
    this.x = x;
    this.y = y;
    this.td = td;
    this.obstacle = false;
    this.player = null;
    this.neighbour = diagonal?[ null, null, null, null, null, null, null, null ]:[ null, null, null, null ];
    this.pathing = null;

    td.acell = this;

    var self = this;

    $(td).on('mouseover', function() { self.onmouseover(self) });
    $(td).on('click',     function() { self.onclick(self) });
}

AstarCell.prototype.neighbour = new Array();

AstarCell.prototype.onmouseover = function(self) {
    if (astar.infotd)
    {
        var info = "pos: " + this.x + "," + this.y + "<br>\n" + "obs: " + this.obstacle + "<br>\n" + "player: " + this.player + "<br>\npath: " + (this.pathing?this.pathing.toString():null) + "<br>\n";
        if (this.pathing)
        {
            info += this.pathing.describe();
        }
        astar.infotd.childNodes[0].innerHTML = info;
    }
};

AstarCell.prototype.onclick = function(self) {
    astar.beginPathing(self);
};

AstarCell.prototype.becomeObstacle = function(chanceToGrow, seed) {
    this.obstacle = true;
    this.chanceToGrow = chanceToGrow;
    this.seed = seed || this;
    this.origin = this.seed.origin || this;
    this.td.className = "obstacle";
};

AstarCell.prototype.toString = function() {
    return this.x + "," + this.y;
};

AstarCell.prototype.distanceFrom = function(cell)
{
    // manhattan distance
//     return Math.abs(this.x - cell.x) + Math.abs(this.y - cell.y);
    // squared euclidean distance
//     return Math.pow(this.x - cell.x, 2) + Math.pow(this.y - cell.y, 2);
    // euclidean distance
    return Math.sqrt(Math.pow(this.x - cell.x, 2) + Math.pow(this.y - cell.y, 2));
};

AstarCell.prototype.update = function() {
    if (this.obstacle) {
        this.td.className = "obstacle";
        return;
    }
    else if (this.player) {
        this.td.className = "player";
        return;
    }
    else if (this.pathing) {
        this.td.className = this.pathing.className();
        var col = this.pathing.tot_cost * (255 / 4000);
        if (col > 255)
            col = 255;
        if (col < 0)
            col = 0;
        col = col.toString(16);
        if (col.length == 1)
            col = "0" + col;
        this.td.style.backgroundColor = "#00" + col + "AA";
        return;
    }
    this.td.style.backgroundColor = "";
    this.td.className = "";
};

/*
 * Player - encapsulates a player and his metadata
 */

function Player(astarcell) {
    this.cell = astarcell;
    this.cell.player = this;
    this.cell.obstacle = false;
    this.cell.update();
};

Player.prototype.toString = function() {
    return "Player";
};

Player.prototype.moveTo = function(cell)
{
    if (cell.obstacle)
        return;

    this.cell.player = null;
    this.cell.update();

    this.cell = cell;

    cell.player = this;
    this.cell.update();
};

/*
 * Pathing
 */

function Pathing(cell, parent) {
    this.cell = cell;

    this.parent = parent;
    if (parent)
        this.move_cost = parent.move_cost + move_weight;
    else
        this.move_cost = 0;

    this.heuristic = cell.distanceFrom(astar.target) * heuristic_weight;
    this.update_cost();

    this.isopen = true;

    this.cell.pathing = this;
    this.cell.update();
}

Pathing.prototype.toString = function() {
    return "G:" + this.move_cost + " H:" + this.heuristic + " F:" + this.tot_cost + (this.isopen?" [O]":" [c]");
};

Pathing.prototype.close = function() {
    this.isopen = false;
    this.cell.update();
};

Pathing.prototype.className = function() {
    return (this.isopen?"path_open":"path_closed");
};

Pathing.prototype.describe = function() {
    var desc = this + "<br>\n";
    if (this.parent)
        desc += "parent: " + this.parent.cell + "|" + this.parent + "<br>\n";
    return desc;
};

Pathing.prototype.update_cost = function(move, heuristic)
{
    this.move_cost = move || this.move_cost;
    this.heuristic = heuristic || this.heuristic;

    this.tot_cost = this.heuristic * 10 + this.move_cost;
};

Pathing.prototype.valueOf = function() {
    return this.tot_cost;
};

Pathing.prototype.destroy = function() {
    this.cell.pathing = null;
    this.cell.update();

    this.parent = null;
};

/**
 * Performs a binary search on the host array. This method can either be
 * injected into Array.prototype or called with a specified scope like this:
 * binaryIndexOf.call(someArray, searchElement);
 *
 * @param {*} searchElement The item to search for within the array.
 * @return {Number} The index of the element. If the element is not found, returns *negative* index of suggested insertion index
 *
 * from http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
 */
function binaryIndexOf(searchElement) {
    'use strict';

    var minIndex = 0;
    var maxIndex = this.length - 1;
    var currentIndex;
    var currentElement;
    var resultIndex;

    while (minIndex <= maxIndex) {
        resultIndex = currentIndex = (minIndex + maxIndex) >> 1;
        currentElement = this[currentIndex];

        if (currentElement < searchElement) {
            minIndex = currentIndex + 1;
        }
        else if (currentElement > searchElement) {
            maxIndex = currentIndex - 1;
        }
        else {
            return currentIndex;
        }
    }

    return ~maxIndex;
}

Array.prototype.binaryIndexOf = binaryIndexOf;

/*
 * Initialisation
 */

$(document).ready(function(){
    var board = $("#board");

    var cells = new Array();
    var obstacles = new Array();

    var table = document.createElement("table");
    table.style.borderWidth = '1';

    var tbody = document.createElement("tbody");

    var obstacles = new Array();

    /*
     * generate grid with a few obstacle blocks in it
     */
    for (var i = 0; i < nrow; i++)
    {
        cells[i] = new Array();
        var tr = document.createElement('tr');
        for (var j = 0; j < ncol; j++)
        {
            var td = document.createElement('td');

            cells[i][j] = new AstarCell(i, j, td);

            if (i > 0)
            {
                cells[i  ][j].neighbour[north] = cells[i-1][j];
                cells[i-1][j].neighbour[south] = cells[i  ][j];

                if (diagonal && j > 0)
                {
                    cells[i  ][j  ].neighbour[northwest] = cells[i-1][j-1];
                    cells[i-1][j-1].neighbour[southeast] = cells[i  ][j  ];
                }
                if (diagonal && (j+1) < ncol)
                {
                    cells[i  ][j  ].neighbour[northeast] = cells[i-1][j+1];
                    cells[i-1][j+1].neighbour[southwest] = cells[i  ][j  ];
                }
            }
            if (j > 0)
            {
                cells[i][j  ].neighbour[west] = cells[i][j-1];
                cells[i][j-1].neighbour[east] = cells[i][j  ];
            }

            if (Math.random() < 0.02)
            {
                cells[i][j].becomeObstacle(Math.random() * 20);
                obstacles.push(cells[i][j]);
            }

            td.appendChild(document.createTextNode('\u0020'));

            tr.appendChild(td);
        }
        if (i == 0)
        {
            var td = document.createElement('td');
            td.id = "infopane";
            td.setAttribute('rowSpan', nrow);
            td.setAttribute('valign', 'top');
            td.style.padding = "0.5em";
            td.appendChild(document.createElement('div'));
            td.childNodes[0].innerHTML = "Info";

            astar.infotd = td;

            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }

    /*
     * grow obstacle blocks
     */
    while (obstacles.length)
    {
        var o = obstacles.pop();

        var n_o = new Array();
        for (var i = 0; i < o.neighbour.length; i++)
        {
            if (o.neighbour[i] && !o.neighbour[i].obstacle)
                n_o.push(o.neighbour[i]);
        }

        while (n_o.length)
        {
            var q = n_o.pop();
            var gr = Math.random() * o.chanceToGrow;

            if (gr > 1)
            {
                q.becomeObstacle(gr - 1, o);
                obstacles.push(q);
            }
        }
    }

    table.appendChild(tbody);
    $("body")[0].appendChild(table);

    var player = new Player(cells[25][25]);

    astar.target = player.cell;
    astar.player = player;
    astar.cells = cells;

    astar.timer = window.setInterval(astar.tick, 25, astar);
});
