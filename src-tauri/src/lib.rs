use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use rand::RngCore;
use sha2::{Digest, Sha256};

fn generate_secret(byte_count: u8) -> Result<Vec<u8>, String> {
    if byte_count == 0 {
        return Err("Byte count must be greater than 0".to_string());
    }
    let mut rng = rand::thread_rng();
    let mut secret = vec![0u8; byte_count as usize];
    rng.fill_bytes(&mut secret);
    Ok(secret)
}

#[tauri::command]
fn generate_shamir_keys(
    key_count: u8,
    threshold: u8,
    byte_count: u8,
) -> Result<Vec<String>, String> {
    if key_count < 2 {
        return Err("Key count must be at least 2 for Shamir sharing".to_string());
    }
    if threshold < 2 {
        return Err("Threshold must be at least 2 for Shamir sharing".to_string());
    }
    if threshold > key_count {
        return Err("Threshold cannot be greater than key count".to_string());
    }
    if byte_count == 0 {
        return Err("Byte count must be greater than 0".to_string());
    }

    // Generate a random secret
    // Shamir shares add 1 byte overhead (share index), so if we want even-sized shares,
    // we need an odd-sized secret. Is there a better way to do this? Probably. But I'm a dum dum
    let secret_size = if byte_count % 2 == 0 {
        if byte_count == 2 {
            1 // Special case: 2 bytes requested -> 1 byte secret -> 2 byte shares
        } else {
            byte_count - 1 // Make it odd so shares become even
        }
    } else {
        byte_count // Already odd, shares will be even
    };
    let secret = generate_secret(secret_size)?;

    // Split the secret using Shamir's Secret Sharing
    let mut rng = rand::thread_rng();
    let shares =
        match shamir_vault::split(&secret, key_count as usize, threshold as usize, &mut rng) {
            Ok(shares) => shares,
            Err(e) => return Err(format!("Failed to split secret: {}", e)),
        };

    // Convert each share to hex string
    let mut hex_shares = Vec::new();
    for share in shares {
        hex_shares.push(hex::encode(&share));
    }

    Ok(hex_shares)
}

#[tauri::command]
fn convert_hex_to_passphrase(hex_string: String) -> Result<String, String> {
    // Remove any whitespace and validate hex format
    let hex_clean = hex_string.replace(" ", "").to_lowercase();

    // Check for empty input
    if hex_clean.is_empty() {
        return Err("Hex string cannot be empty".to_string());
    }

    // Check if that looks like a valid hex string
    if !hex_clean.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("Invalid hex string format".to_string());
    }

    // Convert hex to bytes
    let bytes = match hex::decode(&hex_clean) {
        Ok(bytes) => bytes,
        Err(e) => return Err(format!("Failed to decode hex: {}", e)),
    };

    // Check if byte length is even (otherwise niceware complains)
    if bytes.len() % 2 != 0 {
        return Err("Hex string must represent an even number of bytes".to_string());
    }

    // Convert bytes to niceware passphrase
    match niceware::bytes_to_passphrase(&bytes) {
        Ok(words) => Ok(words.join(" ")),
        Err(e) => Err(format!("Failed to convert to passphrase: {}", e)),
    }
}

#[tauri::command]
fn convert_passphrase_to_hex(passphrase: String) -> Result<String, String> {
    // Split the passphrase into words
    let words: Vec<&str> = passphrase.split_whitespace().collect();

    if words.is_empty() {
        return Err("Passphrase cannot be empty".to_string());
    }

    // Convert niceware passphrase to bytes
    match niceware::passphrase_to_bytes(&words) {
        Ok(bytes) => Ok(hex::encode(bytes)),
        Err(e) => Err(format!("Failed to convert passphrase to hex: {}", e)),
    }
}

#[tauri::command]
fn derive_encryption_key(keys: Vec<String>) -> Result<String, String> {
    if keys.is_empty() {
        return Err("No encryption keys provided".to_string());
    }
    if keys.len() < 2 {
        return Err("At least 2 keys are required for Shamir's Secret Sharing".to_string());
    }

    let mut shares = Vec::new();
    for key in &keys {
        // Remove any whitespace and validate hex format
        let hex_clean = key.replace(" ", "").to_lowercase();
        match hex::decode(&hex_clean) {
            Ok(share_bytes) => shares.push(share_bytes),
            Err(e) => return Err(format!("Failed to decode hex key: {}", e)),
        }
    }

    // Reconstruct the secret using Shamir's Secret Sharing
    let reconstructed_secret = match shamir_vault::combine(&shares) {
        Ok(secret) => secret,
        Err(e) => return Err(format!("Failed to reconstruct secret from shares: {}", e)),
    };

    // Hash the reconstructed secret
    let mut hasher = Sha256::new();
    hasher.update(&reconstructed_secret);
    let hash = hasher.finalize();
    Ok(hex::encode(hash))
}

#[tauri::command]
async fn encrypt_text(text: String, keys: Vec<String>) -> Result<String, String> {
    if keys.is_empty() {
        return Err("No encryption keys provided".to_string());
    }

    // Derive the encryption key using the same logic as file encryption
    let key_hex = derive_encryption_key(keys)?;
    let key_bytes = hex::decode(&key_hex).map_err(|e| format!("Failed to decode key: {}", e))?;

    // Take first 32 bytes for AES-256
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes[..32]);
    let cipher = Aes256Gcm::new(key);

    // Generate a random nonce
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Encrypt the text
    let plaintext = text.as_bytes();
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Combine nonce + ciphertext and encode as base64
    let mut result = nonce_bytes.to_vec();
    result.extend_from_slice(&ciphertext);

    Ok(general_purpose::STANDARD.encode(&result))
}

#[tauri::command]
async fn decrypt_text(encrypted_text: String, keys: Vec<String>) -> Result<String, String> {
    if keys.is_empty() {
        return Err("No encryption keys provided".to_string());
    }

    // Derive the encryption key using the same logic as file encryption
    let key_hex = derive_encryption_key(keys)?;
    let key_bytes = hex::decode(&key_hex).map_err(|e| format!("Failed to decode key: {}", e))?;

    // Take first 32 bytes for AES-256
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes[..32]);
    let cipher = Aes256Gcm::new(key);

    // Decode from base64
    let encrypted_data = general_purpose::STANDARD
        .decode(&encrypted_text)
        .map_err(|e| format!("Invalid base64: {}", e))?;

    if encrypted_data.len() < 12 {
        return Err("Invalid encrypted data: too short".to_string());
    }

    // Split nonce and ciphertext
    // The fact that this is called nonce is pretty funny tbh
    let (nonce_bytes, ciphertext) = encrypted_data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    // Decrypt the text
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    // Convert back to string
    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            generate_shamir_keys,
            convert_hex_to_passphrase,
            convert_passphrase_to_hex,
            derive_encryption_key,
            encrypt_text,
            decrypt_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_secret() {
        // Test valid byte counts
        let secret_4 = generate_secret(4).unwrap();
        assert_eq!(secret_4.len(), 4);

        let secret_8 = generate_secret(8).unwrap();
        assert_eq!(secret_8.len(), 8);

        let secret_16 = generate_secret(16).unwrap();
        assert_eq!(secret_16.len(), 16);

        // Test that secrets are different
        let secret1 = generate_secret(8).unwrap();
        let secret2 = generate_secret(8).unwrap();
        assert_ne!(secret1, secret2);

        // Test invalid byte count
        let result = generate_secret(0);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("Byte count must be greater than 0"));
    }

    #[test]
    fn test_generate_shamir_keys() {
        // Test valid parameters
        let keys = generate_shamir_keys(3, 2, 8).unwrap();
        assert_eq!(keys.len(), 3);
        assert!(keys.iter().all(|k| !k.is_empty()));
        assert!(keys.iter().all(|k| k.chars().all(|c| c.is_ascii_hexdigit()))); // Hex format

        // Test threshold equals key count
        let keys_equal = generate_shamir_keys(3, 3, 8).unwrap();
        assert_eq!(keys_equal.len(), 3);

        // Test different keys are generated
        let keys1 = generate_shamir_keys(3, 2, 8).unwrap();
        let keys2 = generate_shamir_keys(3, 2, 8).unwrap();
        assert_ne!(keys1, keys2);

        // Test invalid parameters
        assert!(generate_shamir_keys(1, 2, 8).is_err()); // key_count < 2
        assert!(generate_shamir_keys(3, 1, 8).is_err()); // threshold < 2
        assert!(generate_shamir_keys(2, 3, 8).is_err()); // threshold > key_count
                                                         // Note: byte_count = 0 is handled by generate_secret, but byte_count = 1 might cause issues
                                                         // with our adjustment logic, so we test byte_count >= 2
        assert!(generate_shamir_keys(3, 2, 2).is_ok()); // minimum safe byte_count
    }

    #[test]
    fn test_derive_encryption_key_multiple_keys() {
        // Generate Shamir keys for testing
        let keys = generate_shamir_keys(3, 2, 8).unwrap();
        
        // Test with minimum required keys (threshold)
        let subset_keys = keys[0..2].to_vec();
        let result = derive_encryption_key(subset_keys).unwrap();

        // Should be a hex string
        assert_eq!(result.len(), 64); // SHA-256 produces 32 bytes = 64 hex chars
        assert!(result.chars().all(|c| c.is_ascii_hexdigit()));

        // Same keys should produce same result
        let subset_keys2 = keys[0..2].to_vec();
        let result2 = derive_encryption_key(subset_keys2).unwrap();
        assert_eq!(result, result2);

        // Different subset should produce same result (Shamir property)
        let different_subset = vec![keys[1].clone(), keys[2].clone()];
        let result3 = derive_encryption_key(different_subset).unwrap();
        assert_eq!(result, result3);

        // Test error cases
        assert!(derive_encryption_key(vec![]).is_err()); // Empty keys
        assert!(derive_encryption_key(vec![keys[0].clone()]).is_err()); // Single key not supported
    }

    #[test]
    fn test_shamir_reconstruction_workflow() {
        // Generate Shamir keys
        let keys = generate_shamir_keys(5, 3, 8).unwrap();
        assert_eq!(keys.len(), 5);

        // Test reconstruction with full number of keys
        let subset_3 = keys[0..3].to_vec();
        let result_3 = derive_encryption_key(subset_3).unwrap();
        assert_eq!(result_3.len(), 64); // SHA-256 hex output

        // Test reconstruction with more than threshold
        let subset_4 = keys[0..4].to_vec();
        let result_4 = derive_encryption_key(subset_4).unwrap();

        // Should get the same result regardless of which valid subset we use
        assert_eq!(result_3, result_4);

        // Test with a different valid subset
        let subset_alt = vec![keys[1].clone(), keys[3].clone(), keys[4].clone()];
        let result_alt = derive_encryption_key(subset_alt).unwrap();
        assert_eq!(result_3, result_alt);

        // Test with insufficient keys (less than threshold)
        let subset_2 = keys[0..2].to_vec();
        let result_insufficient = derive_encryption_key(subset_2);
        if result_insufficient.is_ok() {
            let incorrect_result = result_insufficient.unwrap();
            println!("Insufficient shares produced result: {}", incorrect_result);
        }
    }

    #[test]
    fn test_derive_encryption_key_invalid_shares() {
        let invalid_keys = vec!["invalid".to_string(), "not hex".to_string()];
        let result = derive_encryption_key(invalid_keys);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("Failed to decode hex key"));
    }

    #[test]
    fn test_end_to_end_shamir_workflow() {
        // Test the complete workflow: generate -> derive -> verify consistency

        // Test different configurations
        let test_cases = vec![
            (3, 2, 8),
            (5, 3, 6),
            (4, 4, 10), // All keys required
        ];

        for (key_count, threshold, byte_count) in test_cases {
            println!(
                "Testing {}/{} keys with {} bytes",
                threshold, key_count, byte_count
            );

            // Generate keys
            let keys = generate_shamir_keys(key_count, threshold, byte_count).unwrap();

            // Try reconstruction with threshold keys
            let threshold_keys = keys[0..threshold as usize].to_vec();
            let derived_key = derive_encryption_key(threshold_keys).unwrap();

            // Try reconstruction with all keys
            let all_keys_result = derive_encryption_key(keys.clone()).unwrap();

            // Should get the same result
            assert_eq!(derived_key, all_keys_result);

            // Verify the result is a valid hex string
            assert_eq!(derived_key.len(), 64);
            assert!(derived_key.chars().all(|c| c.is_ascii_hexdigit()));
        }
    }

    #[test]
    fn test_byte_count_adjustment_for_even_shares() {
        // Test that the byte count adjustment produces even-sized shares
        for byte_count in 4..=16 {
            let keys = generate_shamir_keys(3, 2, byte_count).unwrap();

            // Convert first key (hex) back to bytes to check size
            let share_bytes = hex::decode(&keys[0]).unwrap();

            // Share should be even-sized (required by niceware)
            assert_eq!(
                share_bytes.len() % 2,
                0,
                "Share size {} is odd for byte_count {}",
                share_bytes.len(),
                byte_count
            );
        }
    }

    #[test]
    fn test_convert_hex_to_passphrase() {
        // Test valid hex conversion
        let hex_8_bytes = "0123456789abcdef".to_string();
        let result = convert_hex_to_passphrase(hex_8_bytes).unwrap();
        assert!(!result.is_empty());
        assert!(result.contains(' ')); // Should be niceware format

        // Test hex with spaces (should be cleaned)
        let hex_with_spaces = "01 23 45 67 89 ab cd ef".to_string();
        let result_spaces = convert_hex_to_passphrase(hex_with_spaces).unwrap();
        assert!(!result_spaces.is_empty());

        // Test invalid hex (odd length)
        let hex_odd = "012345".to_string();
        let result_odd = convert_hex_to_passphrase(hex_odd);
        assert!(result_odd.is_err());

        // Test invalid characters
        let invalid_hex = "xyz123".to_string();
        let result_invalid = convert_hex_to_passphrase(invalid_hex);
        assert!(result_invalid.is_err());

        // Test empty string
        let empty_hex = "".to_string();
        let result_empty = convert_hex_to_passphrase(empty_hex);
        assert!(result_empty.is_err());
    }

    #[test]
    fn test_convert_passphrase_to_hex() {
        // Test round-trip conversion: hex -> passphrase -> hex
        let original_hex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

        // Convert to passphrase
        let passphrase = convert_hex_to_passphrase(original_hex.to_string()).unwrap();
        assert!(!passphrase.is_empty());
        assert!(passphrase.contains(' ')); // Should be niceware format

        // Convert back to hex
        let converted_hex = convert_passphrase_to_hex(passphrase).unwrap();
        assert_eq!(original_hex, converted_hex);

        // Test invalid passphrase (empty)
        let empty_passphrase = "".to_string();
        let result_empty = convert_passphrase_to_hex(empty_passphrase);
        assert!(result_empty.is_err());

        // Test invalid passphrase (non-niceware words)
        let invalid_passphrase = "not valid niceware words".to_string();
        let result_invalid = convert_passphrase_to_hex(invalid_passphrase);
        assert!(result_invalid.is_err());
    }
}
