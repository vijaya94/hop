/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//# sourceURL=canvas-light.js
"use strict";
let x1, x2, y1, y2;
let clicked = null;

function drawInlineSVG(gc, rawSVG, posX, posY) {
    let svg = new Blob([rawSVG], {type: "image/svg+xml;charset=utf-8"});
    let domURL = self.URL || self.webkitURL || self;
    let url = domURL.createObjectURL(svg);
    let img = new Image;

    img.onload = function () {
        gc.drawImage(this, posX, posY);
        domURL.revokeObjectURL(url);
    };

    img.src = url;
}

let handleEvent = function (event) {
        const mode = event.widget.getData("mode");
        const nodes = event.widget.getData("nodes");
        const hops = event.widget.getData("hops");
        const notes = event.widget.getData("notes");
        const props = event.widget.getData("props");
        const svg = event.widget.getData("svg");
        const magnification = props.magnification/0.75;
        const gridSize = props.gridsize;
        const iconSize = props.iconsize;

        switch (event.type) {
            case SWT.MouseDown:
                x1 = event.x / magnification;
                y1 = event.y / magnification;

                // Determine which node is clicked if any
                for (let key in nodes) {
                    const node = nodes[key];
                    if (node.x <= x1 && x1 < node.x + iconSize
                        && node.y <= y1 && y1 < node.y + iconSize) {
                        clicked = node;
                    }
                }
                break;
            case SWT.MouseUp:
                clicked = null;
                break;
            case SWT.MouseMove:
                x2 = event.x / magnification;
                y2 = event.y / magnification;
                if (mode == null) {
                    break;
                }
                if (mode !== "null") {
                    event.widget.redraw();
                }
                break;
            case SWT.Paint:
                // Client-side does not redraw when first-drawing (null) and after mouseup ("null")
                if (mode == null || mode === "null") {
                    break;
                }
                const gc = event.gc;
                const dx = x2 - x1;
                const dy = y2 - y1;

                if (dx === 0 && dy === 0) {
                    // Draw the SVG
                    //
                    drawInlineSVG(gc, svg, 0, 0);
                } else {
                    // Clear the canvas
                    gc.rect(0, 0, gc.canvas.width / magnification, gc.canvas.height / magnification);
                    gc.fillStyle = 'dark-gray';
                    gc.fill();

                    // Draw grids
                    if (gridSize > 1) {
                        gc.fillStyle = 'light-gray';
                        gc.beginPath();
                        gc.setLineDash([1, gridSize - 1]);
                        // vertical grid
                        for (let i = gridSize; i < gc.canvas.width / magnification; i += gridSize) {
                            gc.moveTo(i, 0);
                            gc.lineTo(i, gc.canvas.height / magnification);
                        }
                        // horizontal grid
                        for (let j = gridSize; j < gc.canvas.height / magnification; j += gridSize) {
                            gc.moveTo(0, j);
                            gc.lineTo(gc.canvas.width / magnification, j);
                        }
                        gc.stroke();
                        gc.setLineDash([]);
                        gc.fillStyle = 'dark-gray';
                    }

                    // Draw hops
                    hops.forEach(function (hop) {
                        gc.beginPath();
                        if (mode === "drag" && nodes[hop.from].selected) {
                            gc.moveTo(snapToGrid(nodes[hop.from].x + dx, gridSize) + iconSize / 2,
                                snapToGrid(nodes[hop.from].y + dy, gridSize) + iconSize / 2);
                        } else {
                            gc.moveTo(nodes[hop.from].x + iconSize / 2, nodes[hop.from].y + iconSize / 2);
                        }
                        if (mode === "drag" && nodes[hop.to].selected) {
                            gc.lineTo(snapToGrid(nodes[hop.to].x + dx, gridSize) + iconSize / 2,
                                snapToGrid(nodes[hop.to].y + dy, gridSize) + iconSize / 2);
                        } else {
                            gc.lineTo(nodes[hop.to].x + iconSize / 2, nodes[hop.to].y + iconSize / 2);
                        }
                        gc.stroke();
                    });

                    for (var key in nodes) {
                        var node = nodes[key];
                        let x = node.x;
                        let y = node.y;

                        // Move selected nodes
                        if (mode === "drag" && (node.selected || node === clicked)) {
                            x = snapToGrid(node.x + dx, gridSize);
                            y = snapToGrid(node.y + dy, gridSize);
                        }
                        // Draw a icon background
                        gc.fillRect(x, y, iconSize, iconSize);

                        // Draw node icon
                        const img = new Image();
                        img.src = 'rwt-resources/' + node.img;
                        gc.drawImage(img, x, y, iconSize, iconSize);

                        // Draw a bounding rectangle
                        if (node.selected || node === clicked) {
                            gc.lineWidth = 3;
                            gc.strokeStyle = 'rgb(0, 93, 166)';
                        } else {
                            gc.strokeStyle = 'rgb(61, 99, 128)'; //colorCrystalText
                        }
                        drawRoundRectangle(gc, x - 1, y - 1, iconSize + 1, iconSize + 1, 8, 8, false);
                        gc.strokeStyle = 'light-gray';
                        gc.lineWidth = 1;

                        // Draw node name
                        gc.fillStyle = 'light-gray';
                        gc.fillText(key, x + iconSize / 2 - gc.measureText(key).width / 2, y + iconSize + 7);
                        gc.fillStyle = 'dark-gray';
                    }

                    // Draw notes
                    notes.forEach(function (note) {
                        gc.beginPath();
                        if (mode === "drag" && note.selected) {
                            gc.rect(snapToGrid(note.x + dx, gridSize), snapToGrid(note.y + dy, gridSize), note.width + 10, note.height + 10);
                        } else {
                            gc.rect(note.x, note.y, note.width + 10, note.height + 10);
                        }
                        gc.stroke();
                    });

                    // Draw a new hop
                    if (mode === "hop" && clicked) {
                        gc.beginPath();
                        gc.moveTo(clicked.x + iconSize / 2, clicked.y + iconSize / 2);
                        gc.lineTo(x2, y2);
                        gc.stroke();
                    }

                    // Draw a selection rectangle
                    if (mode === "select") {
                        gc.beginPath();
                        gc.rect(x1, y1, dx, dy);
                        gc.stroke();
                    }
                }
                break;
        }
    }
;

function snapToGrid(x, gridsize) {
    return gridsize * Math.floor(x / gridsize);
}

/*
 * Port of GCOperationWriter#drawRoundRectangle
 */
function drawRoundRectangle(gc, x, y, w, h, arcWidth, arcHeight, fill) {
    let offset = 0;
    if (!fill && gc.lineWidth % 2 !== 0) {
        offset = 0.5;
    }
    x = x + offset;
    y = y + offset;
    const rx = arcWidth / 2 + 1;
    const ry = arcHeight / 2 + 1;
    gc.beginPath();
    gc.moveTo(x, y + ry);
    gc.lineTo(x, y + h - ry);
    gc.quadraticCurveTo(x, y + h, x + rx, y + h);
    gc.lineTo(x + w - rx, y + h);
    gc.quadraticCurveTo(x + w, y + h, x + w, y + h - ry);
    gc.lineTo(x + w, y + ry);
    gc.quadraticCurveTo(x + w, y, x + w - rx, y);
    gc.lineTo(x + rx, y);
    gc.quadraticCurveTo(x, y, x, y + ry);
    if (fill) {
        gc.fill();
    } else {
        gc.stroke();
    }
}
