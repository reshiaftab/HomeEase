import bcrypt from "bcryptjs";  // Use 'import' instead of 'require'

const password = 'admin@123';  // The admin password we want to hash

// Hash the password using bcrypt
bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
        console.log('Error hashing password:', err);
        return;
    }
    console.log('Hashed password:', hashedPassword);
});