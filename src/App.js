import React, { Component } from "react";
import shortid from "shortid";
import "./App.css";
import teoria, { note } from "teoria";
import _ from "lodash";

window.teoria = teoria;

function getNumeral(chord, name, scale) {
    let scaleIndex = note(chord.root.name()).scaleDegree(scale);
    let numeral = ["?", "I", "II", "III", "IV", "V", "VI", "VII"][scaleIndex];
    switch (chord.quality()) {
        case "minor":
            numeral = numeral.toLowerCase();
            break;
        default: break;
    }
    return chord.root.accidental() + numeral + name;
}

const Node = ({scale, node, selectChord, substituteChord, collapseChord, selected}) => {
    switch (node.type) {
        case "chord":
            let chord = note(node.root).chord(node.name);
            let numeral = getNumeral(chord, node.name, scale);
            return (<div className={`chord ${chord.quality()}`}>
    {/* <div className="chord-substitutions">
        <a href="#" onClick={(e) => {substituteChord(e, node, "V-I")}} className="chord-substitute">V-I</a>
        <a href="#" onClick={(e) => {substituteChord(e, node, "ii-V")}} className="chord-substitute">ii-V</a>
        <a href="#" onClick={(e) => {substituteChord(e, node, "tritone")}} className="chord-substitute">tri</a>
        </div> */}
                <a href="#" onClick={(e) => {selectChord(e, node)}} className="chord-selector">
                    <div className="chord-stack">
                        {/* <span className="chord-numeral">{numeral}</span> */}
                        <span className={`chord-name ${selected && selected.id === node.id ? "selected" : ""}`}>{chord.name}</span>
                    </div>
                </a>
            </div>);
        default: return <div className={`substitution ${node.type}`}>
                            <span className="substitution-type">{node.type}</span>
                            <a href="#" onClick={(e) => {collapseChord(e, node)}} className="substitution-collapse">-</a>
                            {node.children.map((child) => <Node node={child}
                                                                scale={scale}
                                                                selectChord={selectChord}
                                                                substituteChord={substituteChord}
                                                                collapseChord={collapseChord}
                                                                selected={selected}
                                                                key={child.id}></Node>)}
                        </div>;
    }
}

const Info = ({progression, selected, scale, substituteChord, substitutions}) => {
    if (selected) {
        let chord = note(selected.root).chord(selected.name);
        let numeral = getNumeral(chord, selected.name, scale);
        let key = scale.tonic.name() + scale.tonic.accidental() + " " + scale.name;
        return (<div className="info">
            <h1>Selected Chord</h1>
            <p>You've selected the <span>{chord.name}</span> chord. The {chord.name} chord is the {numeral} of the key of {key}. In its current context, it's acting as the ...</p>
            <h3>Possible substitutions:</h3>
            {_.map(Object.keys(substitutions), (substitution) => {
                 if (substitutions[substitution].validate(selected)) {
                    return <p key={substitution} className="possible-substitution" onClick={(e) => {substituteChord(e, selected, substitution)}}>{substitution}</p> 
                 }
             })}
            {/* <p className="possible-substitution">ii - V: <span className="minor">Dm7</span> - <span className="dominant">Cmaj7</span></p> */}
        </div>);
    }
    else {
        return (<p>Click a chord to explore possible substitutions.</p>);
    }
}

class Progression extends Component {

    substitutions = {
        "chord": {
            validate:   node => false,
            substitute: node => node,
            collapse:   node => node
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
                    children: [this.buildChord(V.name() + V.accidental(), "7", "dominant"), node]
                }
            },
            collapse: (node) => {
                let child = node.children[1];
                return this.substitutions[child.type].collapse(child);
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
                    children: [this.buildChord(ii.name() + ii.accidental(), "m7", "minor"), node]
                }
            },
            collapse: (node) => {
                let child = node.children[1];
                return this.substitutions[child.type].collapse(child);
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
                    children: [this.buildChord(tritone.name() + tritone.accidental(), "7", "dominant")]
                }
            },
            collapse: (node) => {
                let child = node.children[0];
                let tritone = note(child.root);
                let dominant = tritone.interval("A4");
                return this.buildChord(dominant.name() + dominant.accidental(), "7", "dominant");
            }
        }
    }

    constructor(props) {
        super(props);

        let progression = this.buildChord("C", "maj7", "major");
        /* progression = this.substitute(progression, progression.id, "V-I");
         * progression = this.substitute(progression, progression.children[0].id, "ii-V");
         * progression = this.substitute(progression, progression.children[0].children[0].id, "V-I");*/
        this.state = {
            progression,
            scale: note("c").scale("major"),
            selected: undefined
        };
        this.substituteChord = this.substituteChord.bind(this);
        this.collapseChord = this.collapseChord.bind(this);
        this.selectChord = this.selectChord.bind(this);
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

    buildChord(root, name, quality) {
        return {
            id: shortid.generate(),
            type: "chord",
            root,
            name,
            quality
        }
    }

    substitute(node, id, substitution) {
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

    render() {
        return (
            <div className="wrapper">
                <div className="progression">
                    <Node key={this.state.progression.id}
                          scale={this.state.scale}
                          node={this.state.progression}
                          selectChord={this.selectChord}
                          substituteChord={this.substituteChord}
                          collapseChord={this.collapseChord}
                          selected={this.state.selected}></Node>
                </div>
                <Info progression={this.state.progression}
                      selected={this.state.selected}
                      scale={this.state.scale}
                      substitutions={this.substitutions}
                      substituteChord={this.substituteChord}></Info>
            </div>
        );
    }
}

export default Progression;
