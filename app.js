const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(methodOverride("_method"));

app.set("view engine", "ejs");

// MONGO URI
const MongoURI = "mongodb://admin:admin7@ds211558.mlab.com:11558/mongoupload";

// Create mongo connection
const conn = mongoose.createConnection(MongoURI);

// Init gfs
let gfs;

conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

// Create Storage Engine
const storage = new GridFsStorage({
  url: MongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads"
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// @route GET /
// @desc Loads form
app.get("/", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render("index", { files: false });
    } else {
      files.map(file => {
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/png"
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render("index", { files: files });
    }
  });
});

// @route POST /uploads
// @desc Uploads file to db
app.post("/upload", upload.single("file"), (req, res) => {
  //   res.json({ file: req.file });
  res.redirect("/");
});

// @route GET /files
// @desc display all files in JSON
app.get("/files", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "No files Exist"
      });
    }

    // File Exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc display Single file
app.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if files
    if (!file || file.length === 0) {
      return res.status(400).json({
        err: "No file Exists"
      });
    }

    // File Exist
    return res.json(file);
  });
});

// @route GET /image/:filename
// @desc display Image
app.get("/image/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if files
    if (!file || file.length === 0) {
      return res.status(400).json({
        err: "No file Exists"
      });
    }

    // Check if Image
    if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
      // Read output to browser
      const readStream = gfs.createReadStream(file.filename);
      readStream.pipe(res);
    } else {
      res.status(404).json({
        err: "Not an Image"
      });
    }
  });
});

// @route DELETE /files/:id
// @desc delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: "uploads" }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({
        err: err
      })
    } else {
      res.redirect("/");
    }
  })
});

const port = 5000;

app.listen(port, () => console.log(`Server running on port ${port}`));
