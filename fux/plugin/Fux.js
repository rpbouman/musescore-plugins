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

var counterPointSpecies = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th"
];

var modes = {
  "Aeolian": [17, 19, 14, 16, 18, 13, 15, 22],
  "Locrian": [19, 14, 16, 18, 13, 15, 17],
  "Ionian": [14, 16, 18, 13, 15, 17, 19],
  "Dorian": [16, 18, 13, 15, 17, 19, 14, 21],
  "Phrygian": [18, 13, 15, 17, 19, 14, 16],
  "Lydian": [13, 15, 17, 19, 14, 16, 18],
  "Mixolydian": [15, 17, 19, 14, 16, 18, 13, 20]
};

function findMode(tpc) {
  var name, value;
  for (name in modes) {
    value = modes[name];
    if (value[0] !== tpc) continue;
    return name;
  }
  return null;
}

/**
*
* .
*
**/
function initSpeciesComboBox(comboBox) {
  var i, n = counterPointSpecies.length;
  for (i = 0; i < n; i++) {
    comboBox.addItem(counterPointSpecies[i] + " species", i+1);
  }
}

/**
*
* CheckCounterPoint
*
*/
function checkCounterPoint(species, cantusFirmus, counterPoint){
  var msg;

  if (cantusFirmus === counterPoint) {
    msg = "Cantus firmus and counter point cannot be the same part.";
    print(msg);
    throw msg;
  }
  var cantusFirmusStaffs = getStaffsOfPart(cantusFirmus);
  var counterPointStaffs = getStaffsOfPart(counterPoint);
  var score = getScore();

  var cfCursor = new Cursor(score);
  cfCursor.staff = cantusFirmusStaffs.offset;
  cfCursor.voice = 0;
  cfCursor.rewind();

  var cpCursor = new Cursor(score);
  cpCursor.staff = counterPointStaffs.offset;
  cpCursor.voice = 0;
  cpCursor.rewind();

  var species = counterPointSpecies[species];
  var method = "check" + species + "SpeciesCounterPoint";
  method = this[method];

  var msgs;
  if (typeof(method) === "function") {
    score.startUndo();
    try {
      msgs = method(cfCursor, cpCursor);
    }
    catch (exception) {
      msgs = exception.toString();
    }
    score.endUndo();
    if (msgs.length) {
      print("Found some issues in this counterpoint:");
      print(JSON.stringify(msgs));
    }
    else {
      print("Counterpoint Ok.");
    }
  }
  else {
    print("Method doesn't exist.");
  }

}

function basicChordCheck(chord){
}


function checkMelodicInterval(interval){
  var result;
  switch (interval) {
    case 8:
    case -9:
    case 9:
    case -10:
    case 10:
    case -11:
    case 11:
      result = "Leap too large.";
      break;
    case -6:
    case 6:
      result = "Melodic tritone is prohibited.";
      break;
    default:
      if (interval > 12 || interval < -12) {
        result = "Leap too large.";
      }
      else {
        result = null;
      }
  }
  return result;
}

function getMelodicDirection(interval){
  if (interval < 0) return "ascending";
  else
  if (interval > 0) return "descending";
  else
  if (interval == 0) return "none";
}

function getMelodicMotion(interval){
  interval = Math.abs(interval);
  if (interval == 0) return "none";
  else
  if (interval > 2) return "skip";
  else
  if (interval < 2) return "step";
}

function getDirection(cfDirection, cpDirection) {
  if (cfDirection === "none" || cpDirection === "none") return "oblique";
  else
  if (cfDirection === cpDirection) return "direct";
  else return "contrary";
}

function checkMotionAndDirection(motion, prevMotion, direction, prevDirection) {
  if (!(motion === prevMotion && direction === prevDirection)) return null;
  var m;
  switch (motion) {
    case "skip":
      m = "subsequent skips in the same direction";
      break;
    case "none":
      m = "more than 2 repeated notes";
      break;
    default:
      m = null;
  }
  return m;
}

function checkCompensationOfLargeSkips(prevInterval, direction, prevDirection){
  var m;
  if (Math.abs(prevInterval) > 7  && ((direction === "none" || prevDirection === direction))) {
    m = "Interval of sixth or more must be compensated by motion in the opposite direction";
  }
  else {
    m = null;
  }
  return m;
}

function msg(m, cursor, msgs){
  //m = pos + " " + m;
  msgs.push(m);
  t = new Text(getScore());
  t.text = m;
  cursor.putStaffText(t);
  var color, obj;
  if (cursor.isChord()) {
    obj = cursor.chord().topNote();
  }
  else
  if (cursor.isRest()) {
    obj = cursor.rest();
  }
  if (obj) {
    obj.color = new QColor(255, 0, 0);
  }
}

//TODO:
// - check for indirect melodic tritone:
//   "The tritone is to be avoided even when reached stepwise if the line is not continued stepwise in the same direction."
// - 10th dissolving by contrary motion of a step into an octave (battuta, page 37)
function check1stSpeciesCounterPoint(cfCursor, cpCursor) {
  var score = getScore();
  var m, msgs = [];
  var pos = 0;
  var tick;
  var lowPart, hiPart;
  if (cfCursor.staff > cpCursor.staff) {
    lowPart = cfCursor;
    hiPart = cpCursor;
  }
  else {
    lowPart = cpCursor;
    hiPart = cfCursor;
  }

  var modeName, mode, raised7th;
  var mustBeLast = false;
  var isLast = false;
  var interval, intervalKind;
  var cpChord, cfChord,
      cpNote, cfNote,
      prevCpNote, prevCfNote,
      cpInterval, cfInterval,
      prevCpInterval, prevCfInterval,
      cpDirection, cfDirection, direction,
      prevCpDirection, prevCfDirection,
      cpMotion, cfMotion,
      prevCpMotion, prevCfMotion,
  ;
  loop: while (!cfCursor.eos()) {
    if (cpCursor.eos()) {
      msg("Counterpoint stops before end of cantus firmus.", cpCursor, msgs);
      break;
    }

    if (isLast) {
      msg("We expected the previous note to be the last.", cpCursor, msgs);
      break;
    }

    if (mustBeLast) {
      isLast = true;
    }

    if (cfCursor.isChord() && !cpCursor.isChord()) {
      msg("CF has a chord but the CP has a rest.", cfCursor, msgs);
    }
    if (!cfCursor.isChord() && cpCursor.isChord()) {
      msg("CF has a rest but the CP has a chord.", cfCursor, msgs);
    }

    tick = pos * 1920; //whole note.
    if (cfCursor.tick() !== tick) {
      msg("CF time out of sync (" + tick + "; " + cfCursor.tick() + ").", cfCursor, msgs);
      break;
    }
    if (cpCursor.tick() !== tick) {
      msg("CP time out of sync (" + tick + "; " + cpCursor.tick() + ").", cpCursor, msgs);
      break;
    }
    if (cfCursor.isChord()) {

      cfChord = cfCursor.chord();
      cpChord = cpCursor.chord();

      if (cfChord === null) {
        msg("CF chord is null.", cfCursor, msgs);
      }
      if (cpChord === null) {
        msg("CP chord is null.", cpCursor, msgs);
      }

      if (cfChord !== null && cpChord !== null) {

        //check some basic properties of the notes
        if (cfChord.type !== 0) {
          msg("CF chord not of normal type.", cfCursor, msgs);
        }
        if (cfChord.notes !== 1) {
          msg("CF chord does not have 1 note.", cfCursor, msgs);
        }

        cfNote = cfChord.topNote();
        if (cfNote.tied !== 0) {
          msg("CF note is tied.", cfCursor, msgs);
        }

        if (cpChord.type !== 0) {
          msg("CP chord not of normal type.", cpCursor, msgs);
        }
        if (cpChord.notes !== 1) {
          msg("CP chord does not have 1 note.", cpCursor, msgs);
        }
        cpNote = cpChord.topNote();
        if (cpNote.tied !== 0) {
          msg("CP note is tied.", cpCursor, msgs);
        }

        //check for voice crossing. Fux doesn't prohibit it, but we do.
        if (cfCursor.staff > cpCursor.staff) {  //cf is lower voice,
          if (cfNote.pitch > cpNote.pitch) {    //so cfNote must not have higher pitch
            msg("CP is upper voice and must not be lower than CF.", cpCursor, msgs);
          }
          interval = cpNote.pitch - cfNote.pitch;
        }
        else {
          if (cpNote.pitch > cfNote.pitch) {      //cp is upper voice, so
            msg("CP is lower voice and must not be higher than CF.", cpCursor, msgs);
          }
          interval = cfNote.pitch - cpNote.pitch;
        }

        while (interval > 12) {
          interval -= 12;
        }
        //print("Normalized Interval: " + interval);

        switch (Math.abs(interval)) {
          case 0:
          case 7:
          case 12:
            intervalKind = "perfect";
            break;
          case 3:
          case 4:
          case 8:
          case 9:
            intervalKind = "imperfect";
            break;
          default:
            intervalKind = "dissonant";
            break;
        }
        //print("Interval: " + interval + " (" + intervalKind + "; CF: " + cfNote.pitch + "; CP: " + cpNote.pitch + ")");

        if (intervalKind === "dissonant") {
          msg("Dissonants are prohibited", cpCursor, msgs);
        }

        if (pos === 0) {
          //first note. Determine the mode.
          modeName = findMode(cfNote.tpc);
          switch (modeName) {
            case null:
              msg("Can't find mode for pitch class " + cfNote.tpc, cfCursor, msgs);
              break loop;
            case "Locrian":
              msg("Locrian is not a valid mode", cfCursor, msgs);
              break loop;
            default:
          }
          //print("Mode: " + modeName);
          mode = modes[modeName];
          raised7th = mode.length === 8;

          if (intervalKind === "perfect") {
            if (cpCursor.staff > cfCursor.staff && (interval % 12)) {
              msg("CP below CF must start on tonic", cpCursor, msgs);
            }
          }
          else {
            msg("Must start with a perfect consonant", cpCursor, msgs);
          }
        }
        else {
          //Not the first note. Check melodic interval
          cfInterval = prevCfNote.pitch - cfNote.pitch;
          m = checkMelodicInterval(cfInterval);
          if (m !== null) {
            msg(m, cfCursor, msgs);
          }

          cfMotion = getMelodicMotion(cfInterval);
          cfDirection = getMelodicDirection(cfInterval);

          cpInterval = prevCpNote.pitch - cpNote.pitch;
          m = checkMelodicInterval(cpInterval);
          if (m !== null) {
            msg(m, cpCursor, msgs);
          }

          cpMotion = getMelodicMotion(cpInterval);
          cpDirection = getMelodicDirection(cpInterval);

          direction = getDirection(cfDirection, cpDirection);

          if (intervalKind === "perfect" && direction !== "contrary") {
            msg("Perfect consonant must be reached by contrary motion", cpCursor, msgs);
          }
        }

        //check melodic balance
        if (pos > 1) {

          m = checkMotionAndDirection(cfMotion, prevCfMotion, cfDirection, prevCfDirection);
          if (m !== null) {
            msg("CF has " + m, cfCursor, msgs);
          }
          m = checkCompensationOfLargeSkips(prevCfInterval, prevCfDirection, cfDirection);
          if (m !== null) {
            msg("CF has " + m, cfCursor, msgs);
          }

          m = checkMotionAndDirection(cpMotion, prevCpMotion, cpDirection, prevCpDirection);
          if (m !== null) {
            msg("CP has " + m, cpCursor, msgs);
          }
          m = checkCompensationOfLargeSkips(prevCpInterval, prevCpDirection, cpDirection);
          if (m !== null) {
            msg("CP has " + m, cpCursor, msgs);
          }
        }

        //check if the notes are part of the mode.
        var i, n = 7, cfInMode, cpInMode;
        cfInMode = false;
        cpInMode = false;
        for (i = 0; i < n; i++) {
          if (mode[i] === cfNote.tpc) cfInMode = true;
          if (mode[i] === cpNote.tpc) cpInMode = true;
        }

        //check if maybe we're dealing with the raised 7th degree
        if (!cfInMode && raised7th) {
          if (cfNote.tpc === mode[7]) {
            cfInMode = true;
            mustBeLast = true;
          }
        }
        if (!cfInMode) {
          msg("CF note does not belong to mode", cfCursor, msgs);
        }

        if (!cpInMode && raised7th) {
          if (cpNote.tpc === mode[7]) {
            cpInMode = true;
            mustBeLast = true;
          }
        }
        if (!cpInMode) {
          msg("CP note does not belong to mode", cpCursor, msgs);
        }

      }
    }

    cfCursor.next();
    prevCfNote = cfNote;
    prevCfDirection = cfDirection;
    prevCfInterval = cfInterval;
    prevCfMotion = cfMotion;

    cpCursor.next();
    prevCpNote = cpNote;
    prevCpDirection = cpDirection;
    prevCpInterval = cpInterval;
    prevCpMotion = cpMotion;

    pos++;
  }

  if (intervalKind !== "perfect") {
    msg("CP must end with a perfect consonant.", cpCursor, msgs);
  }

  if (!cpCursor.eos()) {
    msg("CP continues beyond CF.", cpCursor, msgs);
  }

  return msgs;
}

/**
*
* Sets up the dialog.
*
**/
function initDialog() {
  var dialog = loadDialog(pluginPath + "/Fux.ui");
  var form = dialog.formLayoutWidget;
  initSpeciesComboBox(form.speciesComboBox)
  initPartComboBox(form.cantusFirmusComboBox);
  initPartComboBox(form.counterPointComboBox);
  dialog.buttonBox.accepted.connect(function(){
    checkCounterPoint(
      form.speciesComboBox.currentIndex,
      form.cantusFirmusComboBox.currentIndex,
      form.counterPointComboBox.currentIndex
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
  menu: "Plugins.Check Counterpoint (Fux)",
  init: init,
  run:  run
};

mscorePlugin;
