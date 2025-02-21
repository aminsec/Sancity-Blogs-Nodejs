const multer = require('multer');

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, './uploads/');
    }
  })
  
  // Create the multer instance
const upload = multer({ storage: storage, limits: {fileSize: 15 * 1024 * 1024 } });

module.exports = upload;