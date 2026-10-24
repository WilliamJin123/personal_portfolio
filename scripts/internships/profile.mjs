// Personal facts for application forms (phone, address, student number):
// sealed with credvault (AES-256-GCM, key in the macOS Keychain) at
// ~/.config/internships/profile.sealed, never in the Sheet or the repo. An
// Answers cell names one as SECRET:<name>; loadAnswers fills it in at run time.
//   echo -n "N2L 0C9" | node profile.mjs set postal
//   node profile.mjs list          # names only
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { aesGcmCipher, keychainKey } from "credvault";

const FILE = process.env.INTERNSHIPS_PROFILE || `${process.env.HOME}/.config/internships/profile.sealed`;
const cipher = () => aesGcmCipher(keychainKey({ service: "internships-profile" }));

export function readProfile() {
  if (!existsSync(FILE)) return {};
  return JSON.parse(cipher().open(readFileSync(FILE, "utf8")));
}
function writeProfile(p) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, cipher().seal(JSON.stringify(p)), { mode: 0o600 });
}

if (process.argv[1]?.endsWith("profile.mjs")) {
  const [cmd, name] = process.argv.slice(2);
  if (cmd === "set" && name) {
    const value = readFileSync(0, "utf8").trim();
    if (!value) throw new Error("no value on stdin");
    writeProfile({ ...readProfile(), [name]: value });
    console.log(`set ${name}`);
  } else if (cmd === "list") console.log(Object.keys(readProfile()).join("\n"));
  else console.log("usage: node profile.mjs set <name> < value | list");
}
