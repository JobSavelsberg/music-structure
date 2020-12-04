import * as similarity from "./similarity"

export const chords = {
    major:  {name: "Major",     weight: 1,      template: [1,0,0,0,1,0,0,1,0,0,0,0]},
    minor:  {name: "minor",     weight: 1,      template: [1,0,0,1,0,0,0,1,0,0,0,0]},
    sus2:   {name: "Sus2",      weight: .9,     template: [1,0,1,0,0,0,0,1,0,0,0,0]},
    sus4:   {name: "Sus4",      weight: .9,     template: [1,0,0,0,0,1,0,1,0,0,0,0]},
    dim:    {name: "Dim",       weight: .9,     template: [1,0,0,1,0,0,1,0,0,0,0,0]},
    aug:    {name: "Aug",       weight: .9,     template: [1,0,0,0,1,0,0,0,1,0,0,0]},
    maj7:   {name: "Maj7",      weight: .7,     template: [1,0,0,0,1,0,0,1,0,0,0,1]},
    seven:  {name: "7",         weight: .7,     template: [1,0,0,0,1,0,0,1,0,0,1,0]},
    min7:   {name: "min7",      weight: .7,     template: [1,0,0,1,0,0,0,1,0,0,1,0]},
    min6:   {name: "min6",      weight: .7,     template: [1,0,0,1,0,0,0,1,0,1,0,0]},
    min7b5: {name: "min7/b5",   weight: .7,     template: [1,0,0,1,0,0,1,0,0,0,1,0]},
    minmaj7:{name: "minMaj7",   weight: .7,     template: [1,0,0,1,0,0,0,1,0,0,0,1]},
    sus27:  {name: "Sus2/7",    weight: .7,     template: [1,0,1,0,0,0,0,1,0,0,0,1]},
    sus47:  {name: "Sus4/7",    weight: .7,     template: [1,0,0,0,0,1,0,1,0,0,0,1]},
    dim6:   {name: "Dim6",      weight: .7,     template: [1,0,0,1,0,0,1,0,0,1,0,0]},
    maj7sharp5:{name: "Maj7/#5",   weight: .7,     template: [1,0,0,0,1,0,0,0,1,0,0,1]},
};
const scales= {
    major:  {name: "Major",     weight: 1,      template: [1,0,1,0,1,1,0,1,0,1,0,1]},
    minor:  {name: "minor",     weight: 1,      template: [1,0,1,1,0,1,0,1,1,0,1,0]},
}

const pureMajorMinor= {
    major:  {name: "Major",     weight: 1,      template: [0,0,0,0,1,0,0,0,0,1,0,1]},
    minor:  {name: "minor",     weight: 1,      template: [0,0,0,1,0,0,0,0,1,0,1,0]},
}

export const majorminor = [chords.major, chords.minor];
export const popchords = [...majorminor, chords.dim, chords.aug, chords.seven, chords.maj7, chords.min7];
export const allchords = [...popchords, chords.sus2, chords.sus4, chords.sus27, chords.sus47, chords.min6, chords.min7b5, chords.minmaj7, chords.dim6, chords.maj7sharp5];

export function getConfidence(pitches, chord, bassNote){
    if(bassNote === undefined){
        bassNote = getBassNote(pitches);
    }
    return chord.weight * similarity.cosineTransposed(pitches, chord.template, 12-bassNote);
}

// Is it more Major than minor ? 
export function isMajor(pitches){
    return getConfidence(pitches, chords.major) >= getConfidence(pitches, chords.minor)
}

// Is it more minor than Major ? 
export function isMinor(pitches){
    return !isMajor(pitches);
}

export function getBassNote(pitches){
    let maxPitch = 0;
    let maxIndex = 0;
    for(let i = 0; i < 12; i++){
        if(pitches[i] > maxPitch){
            maxPitch = pitches[i];
            maxIndex = i;
        }
    }
    return maxIndex;
}

export function getHighestConfidenceChord(pitches, chordSet){
    const bassNote = getBassNote(pitches);

    let maxChord = null;
    let maxConfidence = 0;
    chordSet.forEach(chord => {
        const confidence = getConfidence(pitches, chord, bassNote);
        if(confidence > maxConfidence){
            maxConfidence = confidence;
            maxChord = chord;
        }
    });
    return maxChord;
}

export function getMajorMinor(pitches){
    return getHighestConfidenceChord(pitches, majorminor);
}

export function getMajorMinorNess(pitches){
    const majorness = getConfidence(pitches, pureMajorMinor.major);
    const minorness = getConfidence(pitches, pureMajorMinor.minor);
    return Math.max(-1,Math.min(1,(majorness - minorness)*3));
}

export function getPopChord(pitches){
    return getHighestConfidenceChord(pitches, popchords);
}

export function getChord(pitches){
    return getHighestConfidenceChord(pitches, allchords);
}