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

    var lowerNote, upperNote;
    var lowerTpcName, lowerNoteName;
    var upperTpcName, upperNoteName;
    var A = "A".charCodeAt(0);
    var interval, cursorToMark;

    while (!lowerCursor.eos() && !upperCursor.eos()) {

      if (lowerCursor.isRest()) {
        lowerNote = null;
      }
      else
      if (lowerCursor.isChord()) {
        lowerNote = lowerCursor.chord().topNote();
        cursorToMark = lowerCursor;
      }

      if (upperCursor.isRest()) {
        upperNote = null;
      }
      else
      if (upperCursor.isChord()) {
        upperNote = upperCursor.chord().topNote();
        cursorToMark = upperCursor;
      }

      if (upperNote && lowerNote) {
        if (upperNote.pitch < lowerNote.pitch) {
          var tmp = upperNote;
          upperNote = lowerNote;
          lowerNote = tmp;
        }

        lowerTpcName = tpcNames[lowerNote.tpc];
        lowerNoteName = lowerTpcName.charCodeAt(0);

        upperTpcName = tpcNames[upperNote.tpc];
        upperNoteName = upperTpcName.charCodeAt(0);

        if (lowerNoteName < upperNoteName) {
          interval = upperNoteName - lowerNoteName;
          interval += 1;
        }
        else
        if (lowerNoteName > upperNoteName) {
          interval = ((upperNoteName - A) - (lowerNoteName - A));
          interval += 8;
        }
        else
        if (Math.abs(upperNote.pitch - lowerNote.pitch) >= 10) {
          interval = 8;
        }
        else {
          interval = 1;
        }
        putStaffText(cursorToMark, interval);
      }

      lowerCursor.next();
      upperCursor.next();
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
