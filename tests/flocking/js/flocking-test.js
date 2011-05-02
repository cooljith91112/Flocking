/*!
* Flocking - Creative audio synthesis for the Web!
* http://github.com/colinbdclark/flocking
*
* Copyright 2011, Colin Clark
* Dual licensed under the MIT or GPL Version 2 licenses.
*/

/*global module, test, expect, ok, equals, deepEqual, Float32Array*/

var flock = flock || {};

(function () {
    "use strict";
    
    var simpleSynthDef = {
        ugen: "flock.ugen.stereoOut",
        inputs: {
            source: {
                id: "sine",
                ugen: "flock.ugen.sinOsc",
                inputs: {
                    freq: 440,
                    mul: {
                        id: "mod",
                        ugen: "flock.ugen.sinOsc",
                        inputs: {
                            freq: 1.0
                        }
                    }
                }
            }
        }
    };
    
    var createSynth = function (synthDef) {
        return flock.synth(synthDef, {
            sampleRate: 1,
            chans: 1
        });
    };
    
    module("Utility tests");
    
    test("flock.minBufferSize()", function () {
        var audioSettings = {
            rates: {
                audio: 44100,
                control: 64,
                constant: 1
            },
            chans: 2
        };
        var minSize = flock.minBufferSize(500, audioSettings);
        equals(minSize, 44100, 
            "The mininum buffer size for a 44100 KHz stereo signal with 500ms latency should be 44100");
            
        audioSettings.chans = 1;
        minSize = flock.minBufferSize(500, audioSettings);
        equals(minSize, 22050, 
            "The mininum buffer size for a 44100 KHz mono signal with 500ms latency should be 22050");
        
        audioSettings.rates.audio = 48000;
        audioSettings.chans = 2;
        minSize = flock.minBufferSize(250, audioSettings);
        equals(minSize, 24000, 
            "The mininum buffer size for a 48000 KHz stereo signal with 250ms latency should be 24000");
    });
    
    module("Synth tests");
    
    test("Get input values", function () {
        var synth = createSynth(simpleSynthDef);
        
        expect(5);
        
        // Getting simple values.
        equals(synth.input("sine.freq"), 440, "Getting 'sine.freq' should return the value set in the synthDef.");
        equals(synth.input("sine.freq"), 440, "Getting 'sine.freq' a second time should return the same value.");
        equals(synth.input("mod.freq"), 1.0, "Getting 'carrier.freq' should also return the initial value.");
        
        // Get a ugen.
        var ugen = synth.input("mod");
        ok(ugen.gen, "A ugen returned from synth.input() should have a gen() property...");
        equals(typeof (ugen.gen), "function", "...of type function");
    });
    
    test("Set input values", function () {
        var synth = createSynth(simpleSynthDef),
            sineUGen = synth.ugens.sine,
            modUGen = synth.ugens.mod;
        
        // Setting simple values.
        synth.input("sine.freq", 220);
        equals(synth.input("sine.freq"), 220, "Setting 'sine.freq' should update the input value accordingly.");
        equals(sineUGen.inputs.freq.model.value, 220, "And the underlying value ugen should also be updated.");
        synth.input("sine.freq", 110);
        equals(synth.input("sine.freq"), 110, "Setting 'sine.freq' a second time should also work.");
        equals(sineUGen.inputs.freq.model.value, 110, "And the underlying value ugen should also be updated.");
        synth.input("mod.freq", 2.0);
        equals(synth.input("mod.freq"), 2.0, "Setting 'mod.freq' should update the input value.");
        equals(modUGen.inputs.freq.model.value, 2.0, "And the underlying value ugen should also be updated.");
        equals(modUGen.inputs.freq.output[0], 2.0, "Even the ugen's output buffer should contain the new value.");
        
        // Set a ugen def.
        var testUGenDef = {
            ugen: "flock.ugen.dust",
            inputs: {
                density: 200
            }
        };
        var dust = synth.input("sine.mul", testUGenDef);
        equals(synth.ugens.sine.inputs.mul, dust, "The 'mul' ugen should be set to our test Dust ugen.");
        equals(synth.ugens.sine.inputs.mul.inputs.density.model. value, 200, 
            "The ugen should be set up correctly.");
    });


    module("Parsing tests");
    
    var checkParsedTestSynthDef = function (synthDef) {
        var parsedUGens = flock.parse.synthDef(synthDef, {
            rates: {
                audio: 1,
                control: 1,
                constant: 1
            },
            chans: 2
        });
                  
        equals(flock.test.countKeys(parsedUGens), 3, "There should be three named ugens.");            
        ok(parsedUGens[flock.OUT_UGEN_ID], 
            "The output ugen should be at the reserved key flock.OUT_UGEN_ID.");
        
        ok(parsedUGens.sine, "The sine ugen should be keyed by its id....");
        ok(parsedUGens.sine.inputs.table, "...and it should be a real sine ugen.");
        
        ok(parsedUGens.mul, "The mul ugen should be keyed by its id...");
        ok(parsedUGens.mul.model.value, "...and it should be a real value ugen.");
    };
    
    test("flock.parse.synthDef(), no output specified", function () {
        var condensedTestSynthDef = {
            id: "sine",
            ugen: "flock.ugen.sinOsc",
            inputs: {
                freq: 440,
                mul: {
                    id: "mul",
                    ugen: "flock.ugen.value",
                    inputs: {
                        value: 1.0
                    }
                }
            }
        };

        checkParsedTestSynthDef(condensedTestSynthDef);
    });
    
    test("flock.parse.synthDef(), output specified", function () {
        var expandedTestSynthDef = {
            id: flock.OUT_UGEN_ID,
            ugen: "flock.ugen.stereoOut",
            inputs: {
                source: {
                    id: "sine",
                    ugen: "flock.ugen.sinOsc",
                    inputs: {
                        freq: 440,
                        mul: {
                            id: "mul",
                            ugen: "flock.ugen.value",
                            inputs: {
                                value: 1.0
                            }
                        }
                    }
                }
            }
        };
        checkParsedTestSynthDef(expandedTestSynthDef);
    });
    
    test("flock.parse.synthDef() with multiple channels", function () {
        var multiChanTestSynthDef = [
            {
                id: "leftSine",
                ugen: "flock.ugen.sinOsc",
                inputs: {
                    freq: 440
                }
            },
            {
                id: "rightSine",
                ugen: "flock.ugen.sinOsc",
                inputs: {
                    freq: 444
                }
            }
        ];
        
        var parsedUGens = flock.parse.synthDef(multiChanTestSynthDef, {
            rates: {
                audio: 1,
                control: 1,
                constant: 1
            },
            chans: 2
        });
        equals(flock.test.countKeys(parsedUGens), 3, 
            "There should be three named ugens--the two sinOscs and the output.");
        ok(parsedUGens.leftSine, "The left sine ugen should have been parsed correctly.");
        ok(parsedUGens.rightSine, "The right sine ugen should have been parsed correctly.");
        deepEqual(parsedUGens[flock.OUT_UGEN_ID].inputs.source, 
            [parsedUGens.leftSine, parsedUGens.rightSine],
            "The output ugen should have an array of sources, containing the left and right sine ugens.");
    });
})();