import React, { Component } from "react";
import shortid from "shortid";
import "./App.css";
import teoria, { note } from "teoria";
import _ from "lodash";

window.teoria = teoria;

function getNumeral(chord, name, scale) {
    let scaleIndex = chord.root.scaleDegree(scale);
    let numeral = ["?", "I", "II", "III", "IV", "V", "VI", "VII"][scaleIndex];
    switch (chord.quality()) {
        case "minor":
            numeral = numeral.toLowerCase();
            break;
        default: break;
    }
    return chord.root.accidental() + numeral + name;
}

function getDepth(node) {
    if (_.isArray(node)) {
        return 1 + node.reduce((max, child) => {
            return Math.max(max, getDepth(child));
        }, 0);
    }
    if (!node.children) {
        return 0;
    }
    return 1 + node.children.reduce((max, child) => {
        return Math.max(max, getDepth(child));
    }, 0);
}

const Node = ({scale, node, selectChord, substituteChord, collapseChord, selected}) => {
    switch (node.type) {
        case "chord":
            let chord = note(node.root).chord(node.name);
            return (
                <span className={`chord ${chord.quality()}`}>
                    <a href="#" onClick={(e) => {selectChord(e, node)}} className="chord-selector">
                        <span className={`chord-name ${selected && selected.id === node.id ? "selected" : ""}`}>{chord.name}</span>
                    </a>
                </span>
            );
        default:
            let depth = getDepth(node) - 1;
            let style = { padding: `${depth * 20}px 0` };
            return (
                <span className={`substitution ${node.type}`}
                      style={style}>
                    <span className="substitution-header">
                        <a href="#" onClick={(e) => {collapseChord(e, node)}} className="substitution-collapse fa fa-times-circle-o"></a>
                        <span className="substitution-type">{node.type}</span>
                    </span>
                    {node && node.children && node.children.map((child) => {
                         return (
                             <Node node={child}
                                   scale={scale}
                                   selectChord={selectChord}
                                   substituteChord={substituteChord}
                                   collapseChord={collapseChord}
                                   selected={selected}
                                   key={child.id}></Node>
                         );
                     })}
                </span>
            );
    }
}

const Info = ({progression, selected, scale, substituteChord, substitutions, getParent}) => {
    if (selected) {
        let chord = note(selected.root).chord(selected.name);
        let numeral = getNumeral(chord, selected.name, scale);
        let key = scale.tonic.name().toUpperCase() + scale.tonic.accidental() + " " + scale.name;
        let context = "";
        let parentContext = "";
        let parent = getParent(selected);

        if (parent) {
            context = substitutions[parent.type].context(selected, parent);

            let substitution = substitutions[parent.type];
            let collapsed = _.extend({}, substitution.collapse(parent), { id: parent.id });
            let parentParent = getParent(parent);
            if (parentParent) {
                parentContext = substitutions[parentParent.type].context(collapsed, parentParent);
            }
        }

        return (
            <div className="info">
                <p>Add a chord to your progression, or click an existing chord to explore possible substitutions.</p>
                <h2>Selected Chord</h2>
                <p>
                    You've selected the <span>{chord.name}</span> chord. The {chord.name} chord is the {numeral} of the key of {key}.
                    {context ? ` This chord is acting as ${context}` : ``}
                    {parentContext ? ` The ${parent.type} substitution is acting as ${parentContext}` : ``}
                </p>
                {parent && parent.type ? <h3>More about {parent.type} substitutions:</h3> : "" }
                {
                    parent && parent.type && substitutions[parent.type].descriptions.map((description, index) => {
                        let html = { __html: description };
                        return <p dangerouslySetInnerHTML={html} key={index}></p>
                    })
                }
                <h3>Possible substitutions:</h3>
                {_.map(Object.keys(substitutions), (substitution) => {
                    if (substitutions[substitution].validate(selected)) {
                        return <button key={substitution} className="possible-substitution" onClick={(e) => {substituteChord(e, selected, substitution)}}>{substitution}</button> 
                    }
                })}
        </div>);
    }
    else {
        return (<p>Add a chord to your progression, or click an existing chord to explore possible substitutions.</p>);
    }
}

const AddChord = ({scale, addChord}) => {
    let triads = {
        major: [
            "maj7",
            "m7",
            "m7",
            "maj7",
            "dominant",
            "m7",
            "dim7"
        ],
        minor: [
            "mM7",
            "half-diminished",
            "aug7",
            "m7",
            "dominant",
            "maj7",
            "dim7"
        ]
    };

    let chords = scale.simple().map((note, index) => {
        return teoria.note(note).chord(triads[scale.name][index]);
    });

    function go(e) {
        let index = parseInt(e.target.value, 10);
        if (!isNaN(index)) {
            addChord(scale.simple()[index], triads[scale.name][index]);
            e.target.value = "";
        }
    }

    return (
        <select onChange={go}>
            <option value="">Add chord</option>
            {
                chords.map((chord, index) => <option key={chord.name} value={index}>{chord.name}</option>)
            }
        </select>
    );
}

const ChooseKey = ({chooseKey}) => {
    let notes = [ "C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "B", "E", "A", "D", "G" ];
    let scales = [ "major", "minor" ];

    function go(e) {
        e.preventDefault();
        let note = document.getElementById("key-note").value;
        let scale = document.getElementById("key-scale").value;
        chooseKey(note, scale);
    }

    return (
        <div className="choose-scale">
            <h2>Choose a key:</h2>
            <select id="key-note">
                {
                    notes.map((note) => <option key={note} value={note}>{note}</option>)
                }
            </select>
            <select id="key-scale">
                {
                    scales.map((scale) => <option key={scale} value={scale}>{scale}</option>)
                }
            </select>
            <button onClick={go}>Go!</button>
        </div>
    );
}

class Progression extends Component {

    substitutions = {
        "chord": {
            validate:   node => false,
            substitute: node => node,
            collapse:   node => node,
            context:    node => "That is all."
        },
        "V-I": {
            validate: (node) => {
                return true;
            },
            substitute: (node) => {
                let I = note(this.getRootChord(node).root);
                let V = I.interval("P5")
                return {
                    type: "V-I",
                    id: shortid.generate(),
                    children: [this.buildChord(V.name() + V.accidental(), "7"), node]
                }
            },
            collapse: (node) => {
                let child = node.children[1];
                return this.substitutions[child.type].collapse(child);
            },
            descriptions: [
                "A secondary dominant refers to a dominant triad or seventh chord set to resolve to a degree that is not the tonic, with V(7)/V (V[7] of V), the dominant of the dominant, being the most frequently encountered example.",
                "-<a href='https://en.wikipedia.org/wiki/Secondary_dominant'>Wikipedia</a>"
            ],
            context: (node, parent) => {
                let V = parent.children[0];
                let I = parent.children[1];
                if (node.id === V.id) {
                    return `the secondary dominant (V chord) in a V-I substitution.`;
                }
                else if (node.id === I.id) {
                    return `the tonic (I chord) in a V-I substitution.`;
                }
            }
        },
        "ii-V": {
            validate: (node) => {
                return note(node.root).chord(node.name).quality() === "dominant";
            },
            substitute: (node) => {
                let V = note(this.getRootChord(node).root);
                let ii = V.interval("P4").interval("M2");
                return {
                    type: "ii-V",
                    id: shortid.generate(),
                    children: [this.buildChord(ii.name() + ii.accidental(), "m7"), node]
                }
            },
            collapse: (node) => {
                let child = node.children[1];
                return this.substitutions[child.type].collapse(child);
            },
            descriptions: [
                "\"The ii-V substitution is when a chord or each chord in a progression is preceded by its supertonic (ii7) and dominant (V7), or simply its dominant. For example, a C major chord would be preceded by Dm7 and G7. Since secondary dominant chords are often inserted between the chords of a progression rather than replacing one, this may be considered as 'addition' rather than 'substitution'.\"",
                "-<a href='https://en.wikipedia.org/wiki/Chord_substitution#Types'>Wikipedia</a>"
            ],
            context: (node, parent) => {
                let ii = parent.children[0];
                let V = parent.children[1];
                if (node.id === ii.id) {
                    return `the supertonic (ii chord) in a ii-V substitution.`;
                }
                else if (node.id === V.id) {
                    return `the dominant (V chord) chord in a ii-V substitution.`;
                }
            }
        },
        "tritone": {
            validate: (node) => {
                return note(node.root).chord(node.name).quality() === "dominant";
            },
            substitute: (node) => {
                let dominant = note(this.getRootChord(node).root);
                let tritone = dominant.interval("d5");
                return {
                    type: "tritone",
                    id: shortid.generate(),
                    children: [this.buildChord(tritone.name() + tritone.accidental(), "7")]
                }
            },
            collapse: (node) => {
                let child = node.children[0];
                let tritone = note(child.root);
                let dominant = tritone.interval("A4");
                return this.buildChord(dominant.name() + dominant.accidental(), "7");
            },
            descriptions: [
                "In a tritone substitution, the substitute chord only differs slightly from the original chord. If the original chord in a song is G7 (G, B, D, F), the tritone substitution would be D♭7 (D♭, F, A♭, C♭). Note that the 3rd and 7th notes of the G7 chord are found in the D♭7 chord (albeit with a change of role). The tritone substitution is widely used for V7 chords in the popular jazz chord progression \"ii-V-I\".",
                "-<a href='https://en.wikipedia.org/wiki/Chord_substitution#Types'>Wikipedia</a>"
            ],
            context: (node) => {
                let tritone = note(node.root);
                let dominant = tritone.interval("A4").chord("dominant");
                return `a tritone substitute for the ${dominant.name} chord.`;
            }
        }
    }

    constructor(props) {
        super(props);

        let hash = document.location.hash.substr(1);
        this.state = document.location.hash ? JSON.parse(decodeURIComponent(hash)) : {};

        this.substituteChord = this.substituteChord.bind(this);
        this.collapseChord = this.collapseChord.bind(this);
        this.selectChord = this.selectChord.bind(this);
        this.chooseKey = this.chooseKey.bind(this);
        this.addChord = this.addChord.bind(this);
        this.getParent = this.getParent.bind(this);
    }

    substituteChord(e, node, substitution) {
        e.preventDefault();
        let progression = this.substitute(this.state.progression, node.id, substitution)
        this.setState(_.extend({}, this.state, { progression }));
    }

    getRootChord(node) {
        if (node.type === "chord") {
            return node;
        }
        return this.getRootChord(node.children[node.children.length - 1]);
    }

    buildChord(root, name) {
        return {
            id: shortid.generate(),
            type: "chord",
            root,
            name
        }
    }

    substitute(node, id, substitution) {
        if (_.isArray(node)) {
            return node.map((child) => this.substitute(child, id, substitution))
        }
        if (node.id !== id) {
            if (node.children) {
                return _.extend({}, node, {
                    children: node.children.map((child) => this.substitute(child, id, substitution))
                });
            }
            return node;
        }
        if (this.substitutions[substitution].validate(node)) {
            return this.substitutions[substitution].substitute(node);
        }
        else {
            return node;
        }
    }

    collapseChord(e, node) {
        e.preventDefault();
        let progression = this.collapse(this.state.progression, node.id);
        this.setState(_.extend({}, this.state, { progression }));
    }

    collapse(node, id) {
        if (_.isArray(node)) {
            return node.map((child) => this.collapse(child, id));
        }
        if (node.id !== id) {
            if (node.children) {
                return _.extend({}, node, {
                    children: node.children.map((child) => this.collapse(child, id))
                });
            }
        }
        return this.substitutions[node.type].collapse(node);
    }

    selectChord(e, node) {
        e.preventDefault();
        this.setState(_.extend({}, this.state, { selected: node }));
    }

    chooseKey(note, scale) {
        this.setState(_.extend({}, this.state, {
            scale: { note, scale }
        }));
    }

    addChord(note, chord) {
        this.setState(_.extend({}, this.state, {
            progression: [ ...(this.state.progression || []), this.buildChord(note, chord) ]
        }));
    }

    getParent(node) {
        function get(node, id) {
            if (_.isArray(node)) {
                return node.reduce((parent, child) => {
                    return parent || get(child, id);
                }, undefined);
            }
            let found = _.find(node.children, (child) => child.id === id);
            if (found) {
                return node;
            }
            if (!node.children) {
                return undefined;
            }
            else {
                return node.children.reduce((parent, child) => {
                    return parent || get(child, id);
                }, undefined);
            }
        }
        return get(this.state.progression, node.id);
    }

    render() {
        document.location.hash = encodeURIComponent(JSON.stringify(this.state));
        let progression = this.state.progression || [];
        if (this.state.scale) {
            let scale = note(this.state.scale.note).scale(this.state.scale.scale);
            let depth = getDepth(progression);
            let style = { lineHeight: `${depth * (16 * 2 + 4 * 2) + 64}px` };
            return (
                <div className="wrapper">
                    <h2>Key: {this.state.scale.note} {this.state.scale.scale}</h2>
                    <div className="progression" style={style}>
                        {progression && progression.map((child) => {
                            return (
                                <Node node={child}
                                      scale={scale}
                                      selectChord={this.selectChord}
                                      substituteChord={this.substituteChord}
                                      collapseChord={this.collapseChord}
                                      selected={this.state.selected}
                                      key={child.id}></Node>
                            );
                        })}
                    <AddChord scale={scale}
                              addChord={this.addChord}></AddChord>
                    </div>
                    <Info progression={progression}
                          selected={this.state.selected}
                          scale={scale}
                          substitutions={this.substitutions}
                          substituteChord={this.substituteChord}
                          getParent={this.getParent}></Info>
                    <br/>
                    <br/>
                    <a href="/">Reset</a>
                </div>
            );
        }
        else {
            return (
                <div className="wrapper">
                    <ChooseKey chooseKey={this.chooseKey}></ChooseKey>
                </div>
            )
        }
    }
}

export default Progression;
