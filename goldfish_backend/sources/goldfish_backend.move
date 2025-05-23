/// Module: goldfish_backend
module goldfish_backend::goldfish_backend;

use std::string::String;
use sui::table::{Self, Table};

// use sui::event; // Optional: For emitting events

/// The main shared object holding the registry of file IDs per user.
public struct FileRegistry has key {
    id: UID,
    /// Table mapping user address to a vector of their file IDs.
    user_files: Table<address, vector<String>>,
}

// --- Error Codes ---

/// Error when trying to add a file ID that already exists for the user.
const EFileIdAlreadyExists: u64 = 1;
/// Error when trying to remove a file ID that is not associated with the user.
const EFileIdNotFound: u64 = 2;
/// Error when trying to perform an operation for a user not yet in the registry
/// (specifically relevant for remove operation if we check existence first).
const EUserNotFound: u64 = 3; // Optional, depending on remove logic

// --- Events (Optional but Recommended) ---

// /// Event emitted when a file ID is added for a user.
// public struct FileIdAdded has copy, drop {
//     user: address,
//     file_id: ID
// }

// /// Event emitted when a file ID is removed for a user.
// public struct FileIdRemoved has copy, drop {
//     user: address,
//     file_id: ID
// }

// --- Initialization ---

/// Called once when the module is published. Creates and shares the FileRegistry.
fun init(ctx: &mut TxContext) {
    let registry = FileRegistry {
        id: object::new(ctx),
        user_files: table::new<address, vector<String>>(ctx),
    };
    // Share the object so anyone can interact with it
    transfer::share_object(registry);
}

// --- Entry Functions ---

/// Adds a file ID to the calling user's list.
/// Aborts if the file ID already exists in the user's list.
public entry fun add_file_id(registry: &mut FileRegistry, file_id: String, ctx: &TxContext) {
    let sender = tx_context::sender(ctx);

    if (registry.user_files.contains(sender)) {
        // User already has a list, add to it
        let user_files_vec = table::borrow_mut(&mut registry.user_files, sender);

        // Check for duplicates before adding
        assert!(!vector::contains(user_files_vec, &file_id), EFileIdAlreadyExists);

        vector::push_back(user_files_vec, file_id);
    } else {
        // First time user is adding a file ID
        let mut new_vec = vector::empty<String>();
        vector::push_back(&mut new_vec, file_id); // Need &mut even for new vector
        table::add(&mut registry.user_files, sender, new_vec);
    }

    // Optional: Emit an event
    // event::emit(FileIdAdded { user: sender, file_id });
}

/// Removes a file ID from the calling user's list.
/// Aborts if the user has no list or if the file ID is not found in their list.
public entry fun remove_file_id(
    registry: &mut FileRegistry,
    file_id_to_remove: String,
    ctx: &TxContext,
) {
    let sender = tx_context::sender(ctx);

    // Ensure the user exists in the table
    assert!(registry.user_files.contains(sender), EUserNotFound);

    let user_files_vec = table::borrow_mut(&mut registry.user_files, sender);

    // Find the index of the file ID
    let (found, index) = vector::index_of(user_files_vec, &file_id_to_remove);

    // Abort if the file ID wasn't found in the vector
    assert!(found, EFileIdNotFound);

    // Remove the file ID by its index
    let _removed_id = vector::remove(user_files_vec, index);

    // Optional: Clean up - if vector is now empty, remove the user entry from the table
    if (vector::is_empty(user_files_vec)) {
        table::remove(&mut registry.user_files, sender);
    }

    // Optional: Emit an event
    // event::emit(FileIdRemoved { user: sender, file_id: removed_id }); // Can use removed_id or file_id_to_remove
}

// --- View Function (Read-Only) ---

// #[view]
/// Retrieves the list of file IDs for a given user address.
/// Returns an empty vector if the user has no stored file IDs.
public fun get_file_ids(registry: &FileRegistry, user_address: address): vector<String> {
    if (registry.user_files.contains(user_address)) {
        // Return a copy of the vector
        *registry.user_files.borrow(user_address)
    } else {
        vector::empty<String>()
    }
}

// #[view]
/// Retrieves a specific file ID for a user by index. Useful for pagination UIs.
/// Returns `option::none<ID>()` if the index is out of bounds or user doesn't exist.
public fun get_file_id_by_index(
    registry: &FileRegistry,
    user_address: address,
    index: u64,
): Option<String> {
    if (registry.user_files.contains(user_address)) {
        // Borrow the vector immutably since we only need to read
        let user_files_vec = registry.user_files.borrow(user_address);
        let len = vector::length(user_files_vec);

        // Explicitly check if the index is within the valid range [0, len-1]
        if (index < len) {
            // Index is valid. Borrow the element using the standard `vector::borrow`.
            // Since ID has the `copy` ability, we dereference `*` the immutable reference `&ID`
            // returned by `borrow` to get a copy of the ID value itself.
            // Then wrap it in `option::some`.
            option::some(*vector::borrow(user_files_vec, index))
        } else {
            // Index is out of bounds (index >= len)
            option::none<String>()
        }
    } else {
        // User address not found in the table
        option::none<String>()
    }
}

// #[view]
/// Gets the total count of file IDs stored for a specific user.
public fun get_file_count(registry: &FileRegistry, user_address: address): u64 {
    if (registry.user_files.contains(user_address)) {
        vector::length(registry.user_files.borrow(user_address))
    } else {
        0
    }
}
