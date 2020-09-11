var assert = require('assert');
const audioUtil = require('../src/app/audioUtil');
const chalk = require('chalk');


describe('audioUtil', function () {
  describe('tonalVectorColor()', function () {
    it('should give entire color wheel', function(){
      for(let i = 0; i < 13; i++){
        const note = audioUtil.circleOfFifths[i%12];
        let pitches = new Array(13).fill(0);
        pitches[note] = 1;
        const color = audioUtil.tonalVectorColor(pitches);
        console.log(chalk.bgHex(color)(`\t ${audioUtil.getNoteName(note)}    `));
      }
    });
    it('should give pure grey tones for tritone chords', function(){
        let pitches = new Array(12).fill(0);
        pitches[0] = 1;
        pitches[1] = 1;
        pitches[6] = 1;
        pitches[7] = 1;
        const color = audioUtil.tonalVectorColor(pitches);
        console.log(chalk.bgHex(color)(`\t atonal chord `));
    });
    it('should give greyish tones for weird chords', function(){
      let pitches = new Array(12).fill(0);
      pitches[0] = 1;
      pitches[2] = .7;
      pitches[6] = .8;
      pitches[8] = 1;
      pitches[9] = .5;

      const color = audioUtil.tonalVectorColor(pitches);
      console.log(chalk.bgHex(color)(`\t atonal chord `));
  });
  });
});
