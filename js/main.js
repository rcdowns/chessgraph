/*
 * A simple chess AI, by someone who doesn't know how to play chess.
 * Uses the chessboard.js and chess.js libraries.
 *
 * Copyright (c) 2020 Zhang Zeyu
 */

var board = null
var $board = $('#myBoard')
var game = new Chess()
var $status = $('#status')
var $fen = $('#fen')
var $pgn = $('#pgn')

/*
 * RULES
 */

function onDragStart (source, piece, position, orientation) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false

  // only pick up pieces for the side to move
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
  }
}

function onDrop (source, target) {
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  })

  // illegal move
  if (move === null) return 'snapback'

  updateStatus()
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
async function onSnapEnd () {
  board.position(game.fen(), false)
  updateHighlights()
}

function updateStatus () {
  var status = ''
  var moveColor = 'White'
  if (game.turn() === 'b') {
    moveColor = 'Black'
  }

  // checkmate?
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.'
  }

  // draw?
  else if (game.in_draw()) {
    status = 'Game over, drawn position'
  }

  // game still on
  else {
    status = moveColor + ' to move'

    // check?
    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check'
    }
  }

  $status.html(status)
  $fen.html(game.fen())
  $pgn.html(game.pgn())
}

function updateHighlights() {
  clearHighlights()
  highlightMoves()
}

function clearHighlights() {
  $('.fill-to-parent').remove();
  $('.attack-count-text').remove();
}

/*
 * Highlighting
 */
function highlightMoves() {
  // TODO refactor
  var attackTotals = new Map()
  game.SQUARES.forEach(square => {
    var blackAttacks = game.attacks({
      square: square,
      color: 'b'
    })
    var whiteAttacks = game.attacks({
      square: square,
      color: 'w'
    })
    
    var whiteAttackCount = whiteAttacks.get(square)
    var blackAttackCount = blackAttacks.get(square)
    attackTotals.set(square, whiteAttackCount - blackAttackCount)
  })
  attackTotals.forEach(function(attackCount, square) {
    colorSquare(square, attackCount)
  })
}

function colorSquare (square, attackCount) {
  const MAX_ATTACKS = 5;
  var $square = $(`#myBoard .square-${square}`)

  // add text
  const invisible = {'visibility': 'hidden'}
  const visible = {'visibility': 'visible'}
  var attackText = $(`<div>${attackCount}</div>`).addClass('notation-322f9').addClass('attack-count-text').css(invisible)
  $square.append(attackText);
  $square.mouseover(function() {
    attackText.css(visible)
  })
  $square.mouseout(function() {
    attackText.css(invisible)
  })

  const MIN_ALPHA = 0.2
  var color = {};
  if (attackCount > 0) {
    var gradient = MIN_ALPHA + Math.min(attackCount/MAX_ATTACKS, 1-MIN_ALPHA);
    color = {'background-color': `rgba(255, 0, 0, ${gradient})`}
  } else if (attackCount < 0) {
    var gradient = MIN_ALPHA + Math.min(-1 * attackCount/MAX_ATTACKS, 1-MIN_ALPHA);
    color = {'background-color': `rgba(0, 0, 255, ${gradient})`}
  }
  var $coloredSquare = $("<div></div>").css(color).addClass("fill-to-parent");

  addColorToSquare(square, $square, $coloredSquare)
}

function addColorToSquare(square, $square, $coloredSquare) {
  // Add the color as the child of the square, if there is a piece make it the child of the color
  $square.append($coloredSquare);
  if ($square.find('img').length >= 1) {
    $square.children('img').first().detach().appendTo($coloredSquare);
  }
}

var config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
  onSnapbackEnd: updateHighlights
}
board = Chessboard('myBoard', config)

updateStatus()
highlightMoves()

// How to add attacks together???
// bishop on pawn adds one to pawn attack
// rook or bishop on queen adds just to subset of attack, same for king but with fewer squares
// rook on rook on queen adds two
// pawn on pawn on pawn adds one to each
// anything can be pinned
// how many times is (square) attacked?
// foreach square on the board:
//    add 1 if piece legally and unblocked attacks this square
//    add carry over attack for this piece and offset

// how to get carry over attack for this piece and original square
// 0 if it is a knight
// return number of attacks on the original square if the piece is not there -
// (the number of attacks on the original square if the piece is there - 1)
// need to do that recursively
