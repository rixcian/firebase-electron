import fs from 'fs';
import path from 'path';

function copyProtoFiles(sourceDir, targetDir) {
    // Ensure the target directory exists
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Function to recursively find all .proto files
    function findProtoFiles(dir, fileList = []) {
        const files = fs.readdirSync(dir, { withFileTypes: true });

        for (const file of files) {
            const filePath = path.join(dir, file.name);
            if (file.isDirectory()) {
                findProtoFiles(filePath, fileList);
            } else if (path.extname(file.name) === '.proto') {
                fileList.push(filePath);
            }
        }

        return fileList;
    }

    // Find all .proto files in the source directory and its subdirectories
    const protoFiles = findProtoFiles(sourceDir);

    // Copy each .proto file to the target directory
    for (const sourcePath of protoFiles) {
        const fileName = path.basename(sourcePath);
        const targetPath = path.join(targetDir, fileName);
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`Copied: ${sourcePath} -> ${targetPath}`);
    }
}

// Copy .proto files from src to dist
copyProtoFiles('src', 'dist');
