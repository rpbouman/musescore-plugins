/**
*
* Get a score, or the current score.
*
**/
function getScore(score){
  return score || curScore;
}

/**
*
* Loop through the parts of a score and let a callback handle each part.
*
**/
function forEachPart(callback, score){
  score = getScore(score);
  if (typeof(score) === "undefined") return;
  var numParts = score.parts;
  for (var i = 0; i < numParts; i++) {
    if (callback(i, score.part(i)) === false) return false;
  }
  return true;
}

/**
 *
 * Get the first stave and the number of staves of a part.
 *
 */
function getStaffsOfPart(partId) {
  var staffs = {
    offset: 0,
    count: 0
  };
  var thePart;
  forEachPart(function(index, part){
    thePart = index === partId;
    staffs[(thePart ? "count" : "offset")] += part.staves;
    if (thePart) return false;
  });
  return staffs;
}

/**
*
* Fill a combobox to choose one particular part.
*
**/
function initPartComboBox(comboBox) {
  var name;
  forEachPart(function(index, part){
    name = "Part " + (index + 1) + " (" + part.longName + ")";
    comboBox.addItem(name, index);
  });
}

/**
* Add staff text
*/
function putStaffText(cursor, string) {
  var text = new Text(getScore());
  text.text = string;
  text.yOffset = -4;
  cursor.putStaffText(text);
}

/**
*
* Load a dialog from a Qt ui file.
*
**/
function loadDialog(filename) {
  var file = new QFile(filename);
  file.open(QIODevice.OpenMode(QIODevice.ReadOnly, QIODevice.Text));

  var loader = new QUiLoader(null);
  var dialog = loader.load(file, null);

  return dialog;
}

var tpcNames = {
  "31": "A##",
  "19": "B",
  "7":  "Cb",
  "24": "A#",
  "12": "Bb",
  "0":  "Cbb",
  "29": "G##",
  "17": "A",
  "5":  "Bbb",
  "22": "G#",
  "10": "Ab",
  "27": "F##",
  "15": "G",
  "3":  "Abb",
  "32": "E##",
  "20": "F#",
  "8":  "Gb",
  "25": "E#",
  "13": "F",
  "1":  "Gbb",
  "30": "D##",
  "18": "E",
  "6":  "Fb",
  "23": "D#",
  "11": "Eb",
  "-1": "Fbb",
  "28": "C##",
  "16": "D",
  "4":  "Ebb",
  "33": "B##",
  "21": "C#",
  "9":  "Db",
  "26": "B#",
  "14": "C",
  "2":  "Dbb"
};

function writeInterval(upperCursor, lowerCursor) {
  var upperChord, lowerChord;
  var upperNote, lowerNote;

  upperChord = upperCursor.isChord() ? upperCursor.chord() : null;
  if (upperChord) {
    upperNote = upperChord.topNote();
  }
  else {
    print("No upper note. " + upperCursor.isRest());
    upperNote = null;
  }

  lowerChord = lowerCursor.isChord() ? lowerCursor.chord() : null;
  if (lowerChord) {
    lowerNote = lowerChord.topNote();
  }
  else {
    print("No lower note. " + lowerCursor.isRest());
    lowerNote = null;
  }

  if (!upperNote) {
    return;
  }

  if (!lowerNote) {
    return;
  }

  if (upperNote.pitch < lowerNote.pitch) {
    var tmp = upperNote;
    upperNote = lowerNote;
    lowerNote = tmp;
  }

  var upperTpcName = tpcNames[upperNote.tpc];
  var upperNoteName = upperTpcName.charAt(0);
  var lowerTpcName = tpcNames[lowerNote.tpc];
  var lowerNoteName = lowerTpcName.charAt(0);

  var intervalName;
  if (lowerNoteName < upperNoteName) {
    intervalName = upperNoteName.charCodeAt(0) - lowerNoteName.charCodeAt(0);
    intervalName += 1;
  }
  else
  if (lowerNoteName > upperNoteName) {
    intervalName = ((upperNoteName.charCodeAt(0) - "A".charCodeAt(0)) - (lowerNoteName.charCodeAt(0) - "A".charCodeAt(0)));
    intervalName += 8;
  }
  else {
    intervalName = 1;
  }

  print("upper tpc: " + upperTpcName + "; lower tpc: " + lowerTpcName);
  putStaffText(
    upperCursor.tick() > lowerCursor.tick() ? lowerCursor : upperCursor,
    intervalName
  );
}

function writeIntervals(upperPart, lowerPart){
  if (upperPart === lowerPart) {
    msg = "Must select two distinct parts.";
    print(msg);
    throw msg;
  }
  print("Upper part: " + upperPart + "; lower part: " +lowerPart );
  var score = getScore();

  var upperPartStaffs = getStaffsOfPart(upperPart);
  var lowerPartStaffs = getStaffsOfPart(lowerPart);

  var upperCursor = new Cursor(score);
  upperCursor.staff = upperPartStaffs.offset;
  upperCursor.voice = 0;
  upperCursor.rewind();

  var lowerCursor = new Cursor(score);
  lowerCursor.staff = lowerPartStaffs.offset;
  lowerCursor.voice = 0;
  lowerCursor.rewind();

  score.startUndo();
  try {
    var cursorToSync, tickToSync;
    var upperTick, lowerTick;

    while (true) {
      writeInterval(upperCursor, lowerCursor);

      if (upperCursor.eos() && lowerCursor.eos()) break;

      upperTick = upperCursor.tick();
      lowerTick = lowerCursor.tick();

      print("upperTick: " + upperTick + "; lowerTick: " + lowerTick);
      if (upperTick < lowerTick) {
        //upper cursor is behind.
        print("cursor to move is upper");
        cursorToMove = upperCursor;
        tickToSync = lowerTick;
      }
      else
      if (lowerTick < upperTick) {
        //lower cursor is behind.
        print("cursor to move is lower");
        cursorToMove = lowerCursor;
        tickToSync = upperTick;
      }
      else {
        //cursors are in sync
        print("cursors are in sync");
        if (!upperCursor.eos()) {
          cursorToMove = upperCursor;
          if (!lowerCursor.eos()) lowerCursor.next();
        }
        else
        if (!lowerCursor.eos()) {
          cursorToMove = lowerCursor;
        }
      }
      cursorToMove.next();
    }
  }
  catch (ex) {
    print(ex.toString());
  }
  score.endUndo();
}

/**
*
* Sets up the dialog.
*
**/
function initDialog() {
  var dialog = loadDialog(pluginPath + "/intervals.ui");
  var form = dialog.formLayoutWidget;
  initPartComboBox(form.upperPartComboBox);
  initPartComboBox(form.lowerPartComboBox);
  dialog.buttonBox.accepted.connect(function(){
    writeIntervals(
      form.upperPartComboBox.currentIndex,
      form.lowerPartComboBox.currentIndex
    );
  });
  return dialog;
}

function init(){
}

function run(){
  var dialog = initDialog();
  dialog.show();
}

var mscorePlugin = {
  menu: "Plugins.Intervals",
  init: init,
  run:  run
};

mscorePlugin;
