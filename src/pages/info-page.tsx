import { PageLayout } from "./page-layout";
import { APP_VERSION } from "@/lib/constants";

export function InfoPage() {
  return (
    <PageLayout pageTitle="About Shhare" pageDescription={`Version: v${APP_VERSION}`}>
      <div className="flex flex-col h-full">
        <p>
          A secure text encryption application with support for Shamir's Secret Sharing algorithm. Built with Rust,
          Tauri, React, and daisyUI.
          <br />
          <br />
          This software is open source and available under the MIT License.
        </p>

        <div className="divider" />

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div>
            <p className="font-semibold text-lg text-primary">How secure is Shhare?</p>
            <p className="text-base-content/100">
              For most users, Sshare provides 'good enough' security. It uses AES-256 encryption which is considered
              secure for most applications (and military-grade, if someone's selling you a VPN), however the application
              itself is not audited and should not be used where there is a risk of a dedicated attacker. In particular,
              Shhare does not implement any measures to protect keys in-memory, though an attacker with direct access to
              your machine would probably be able to compromise the keys anyway.
              <br />
              <br />
              If you require a high level of security and/or deniability, you should use an established open-source and
              audited solution such as VeraCrypt.
            </p>
          </div>

          <div>
            <p className="font-semibold text-lg text-primary">How do I use the PassPhrases and Key?</p>
            <p className="text-base-content/100">
              Shhare generates a secure encryption key, and implements Shamir's Secret Sharing algorithm to split that
              key into multiple shares. There is a lot of maths involved which is beyond the scope of this help page,
              but in short, the original encryption key can only be reconstructed if a certain number of shares are
              combined together.
              <br />
              <br />
              When keys are loaded in Shhare the reconstructed encryption key is shown at the bottom of the window. The
              primary use case is to encrypt text using the built-in notes function, which uses AES-256 to
              encrypt/decrypt plain text.
              <br />
              <br />
              An important note is that when reconstructing a key it's impossible to verify whether the correct key has
              been found unless we have data to test it against. Multiple incorrect Passphrases will combine into a
              valid-looking key that won't actually decrypt your data!
              <br />
              <br />
              Once you have secured your data, you can share the data and passphrases with others. Because no single
              passphrase can decrypt the data, even if one of the passphrases is compromised, the data will remain
              secure (though it's a good idea to re-encrypt the data with a new key if that happens!).
            </p>
          </div>

          <div>
            <p className="font-semibold text-lg text-primary">What's the difference between a PassPhrase and a Key?</p>
            <p className="text-base-content/100">
              They are just different ways of representing the encryption key.
              <br />
              <br />
              A 'PassPhrase' is a sequence of words or characters, whereas the 'Key' refers to the actual hexadecimal
              string used in the encryption process. In Shhare, a PassPhrase is converted into a key using a secure
              hashing algorithm (SHA-256), and we can reverse the operation to obtain the original PassPhrase. The
              reason to use a passphrase is that they are easier to write down and remember.
              <br />
              <br />
              For example, the PassPhrase "fart in my mouth" would be hashed to "4cc46b268cfd8b7f". Which is easier to
              remember?
            </p>
          </div>

          <div>
            <p className="font-semibold text-lg text-primary">Security Best Practices</p>
            <ul className="text-base-content/100 list-disc list-inside space-y-1 pl-2">
              <li>Store your passphrases securely and separately from encrypted data</li>
              <li>Do not store multiple passphrases together</li>
              <li>If a passphrase is lost or compromised, re-encrypt the data with a new key / passphrases</li>
              <li>Consider using a password manager (with MFA) to store passphrases</li>
              <li>Always verify data integrity after encryption and decryption</li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
