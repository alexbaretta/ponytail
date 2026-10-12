# Native rework QA dependency ownership repair

The clean suite on `d04aae6` terminated with 17 passes and one failure. The
correction worker produced the required value, replayed both commits and passed
focused QA, but included `node_modules/typescript/package.json` and Node type
metadata in its proof inputs. The fixture's shared `node_modules` symlink
resolved those files outside its reserved checkout. The canonical submission
reader correctly rejected this physical ownership violation before re-review.
This run establishes no OBL-51 discharge.

The [actual failed output](native-review-rework-boundary-failure.txt) is retained
with trailing horizontal whitespace normalized. The original output is
`tmp/binding-selectors/native-rework-clean-native-suite.txt`.

The fixture now copies its existing TypeScript compiler, Node types and their
Undici type dependency into its ignored checkout-local `node_modules`. Its
declared compilation inputs then have valid physical ownership. The submission
reader and its repository-boundary validation are unchanged. Strict compilation
passes; clean native proof and current certificate renewal remain required.
