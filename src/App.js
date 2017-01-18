import React, { Component } from "react";
import shortid from "shortid";
import "./App.css";
import teoria, { note } from "teoria";
import _ from "lodash";

window.teoria = teoria;

const Node = ({scale, node, substituteChord, collapse}) => {

    function getNumeral(chord, scale) {
        let scaleIndex = note(chord.root.name()).scaleDegree(scale);
        let numeral = ["?", "I", "II", "III", "IV", "V", "VI", "VII"][scaleIndex];
        switch (chord.quality()) {
            case "minor":
                numeral = numeral.toLowerCase();
                break;
        }
        return chord.root.accidental() + numeral;
    }

    switch (node.type) {
        case "chord":
            let chord = note(node.root).chord(node.name);
            let numeral = getNumeral(chord, scale);
            return (<div className={`chord ${chord.quality()}`}>
                <div className="chord-substitutions">
                    <a href="#" onClick={(e) => {substituteChord(e, node, "V-I")}} className="chord-substitute">V-I</a>
                    <a href="#" onClick={(e) => {substituteChord(e, node, "ii-V")}} className="chord-substitute">ii-V</a>
                    <a href="#" onClick={(e) => {substituteChord(e, node, "tritone")}} className="chord-substitute">tri</a>
                </div>
                <div className="chord-stack">
                    <span className="chord-numeral">{numeral}</span>
                    <span className="chord-name">{chord.name}</span>
                </div>
            </div>);
        default: return <div className={`substitution ${node.type}`}>
                            <a href="#" onClick={(e) => {collapse(e, node)}} className="substitution-collapse">-</a>
                            {node.children.map((child) => <Node node={child}
                                                                scale={scale}
                                                                substituteChord={substituteChord}
                                                                collapse={collapse}
                                                                key={child.id}></Node>)}
                        </div>;
    }
}

class Progression extends Component {

    substitutions = {
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
            }
        }
    }

    constructor(props) {
        super(props);

        let progression = this.buildChord("C", "maj7", "major");
        /* progression = this.substitute(progression, progression.id, "V-I");
         * progression = this.substitute(progression, progression.children[0].id, "ii-V");
         * progression = this.substitute(progression, progression.children[0].children[0].id, "V-I");*/
        this.state = progression;
        this.substituteChord = this.substituteChord.bind(this);
        this.collapse = this.collapse.bind(this);
        console.log("this.substitutions", this.substitutions);
    }

    substituteChord(e, node, substitution) {
        e.preventDefault();
        let state = this.substitute(this.state, node.id, substitution)
        this.setState(state);
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

    collapse(e, node) {
        e.preventDefault();
        switch (node.type) {
            case "chord":
                return node;
            default:
                let chord = this.getRootChord(node);
                node.type = "chord";
                node.root = chord.root;
                node.name = chord.name;
                node.quality = chord.quality;
                delete node.children;
                break;
        }
        this.setState(this.state);
    }

    render() {
        let scale = note("c").scale("major");
        return (
            <div className="wrapper">
                <div className="progression">
                    <Node key={this.state.id}
                          scale={scale}
                          node={this.state}
                          substituteChord={this.substituteChord}
                          collapse={this.collapse}></Node>
                </div>
                <p>Click a chord to explore possible substitutions.</p>
                <div className="info">
                    <h1>Selected Chord</h1>
                    <p>You've selected the <span>Cmaj7</span> chord. In it's current context, Cmaj7 is acting as the tonic of this chord progression.</p>
                    {/* <select>
                        <option>C</option>
                        <option>C#</option>
                        </select>
                        <select>
                        <option></option>
                        <option>m</option>
                        <option>maj7</option>
                        <option>m7</option>
                        <option>7</option>
                        </select>
                        <br/> */}
                    <h3>Possible substitutions:</h3>
                    <p className="possible-substitution">ii - V: <span className="minor">Dm7</span> - <span className="dominant">Cmaj7</span></p>
                </div>
            </div>
        );
    }
}

export default Progression;
