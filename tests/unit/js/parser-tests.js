/*!
* Flocking Parser Tests
* http://github.com/colinbdclark/flocking
*
* Copyright 2011-2015, Colin Clark
* Dual licensed under the MIT or GPL Version 2 licenses.
*/

/*global require, module, test, equal, deepEqual*/

var fluid = fluid || require("infusion"),
    flock = fluid.registerNamespace("flock");

(function () {
    "use strict";

    module("flock.parse.ugenForDef");

    flock.init();
    
    test("Special input handling", function () {
        var def = {
            ugen: "flock.ugen.osc",
            inputs: {
                table: [0.0, 0.5, 1.0, 0.5, 0.0, -0.5, -1.0, -0.5, 0.0],
                freq: {
                    ugen: "flock.ugen.value",
                    inputs: {
                        value: 299
                    }
                },
                buffer: {
                    url: "http://a.url"
                }
            }
        };

        var actual = flock.parse.ugenForDef(def);
        equal(actual.inputs.freq.inputs.value, 299,
            "A value input should not be expanded.");
        deepEqual(actual.inputs.table, def.inputs.table,
            "A table input should not be expanded.");
        deepEqual(actual.inputs.buffer, def.inputs.buffer,
            "A buffer def input should not be expanded.");
    });

    test("Rate expansion", function () {
        var ugenDef = {
            ugen: "flock.ugen.sinOsc",
            rate: "kr",
            freq: {
                ugen: "flock.ugen.sinOsc",
                rate: flock.rates.AUDIO,
                freq: 440
            },
            mul: {
                ugen: "flock.ugen.lfNoise",
                rate: "ar"
            },
            add: {
                ugen: "flock.ugen.dust",
                rate: "cr"
            }
        };

        var parsed = flock.parse.ugenForDef(ugenDef);
        equal(parsed.rate, flock.rates.CONTROL,
            "A compressed control rate should be expanded to its full value.");
        equal(parsed.inputs.freq.rate, flock.rates.AUDIO,
            "An already-expanded audio rate should not be mangled.");
        equal(parsed.inputs.mul.rate, flock.rates.AUDIO,
            "A compressed audio rate should be expanded to its full value.");
        equal(parsed.inputs.add.rate, flock.rates.CONSTANT,
            "A compressed constant rate should be expanded to its full value.");
    });

    test("Options merging", function () {
        var sinOscDef = {
            ugen: "flock.ugen.sinOsc",
            phase: 1.0
        };

        var ugen = flock.parse.ugenForDef(sinOscDef);
        equal(ugen.rate, flock.rates.AUDIO,
            "The rate option should be supplied by the ugen's defaults.");
        equal(ugen.inputs.freq.model.value, 440,
            "The frequency input should be supplied by the ugen's defaults.");
        equal(ugen.inputs.phase.model.value, 1.0,
            "The ugen's default phase input should be overridden by the ugenDef.");
    });
}());
