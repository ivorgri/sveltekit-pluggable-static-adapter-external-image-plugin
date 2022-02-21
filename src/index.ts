import glob = require("tiny-glob");
import { mkdir, createWriteStream } from "fs";
import { readFile, writeFile } from "fs/promises";
import * as url from "url";
import * as https from "https";

/**
 * @param {any} builder
 * @param {string} pagesDirectory
 * @param {string} assetsDirectory
 * @param {string[]} originUrls
 */
async function replaceExternalImages(
  originUrls: string | string[],
  builder: any,
  pagesDirectory: string,
  assetsDirectory: string
) {
  builder.log("Starting replacement of images from external sources");
  if (typeof originUrls === "string") {
    originUrls = [originUrls];
  }
  const files = await glob("**/*", {
    cwd: pagesDirectory,
    dot: true,
    absolute: true,
    filesOnly: true,
  });

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const fileContent = await readFile(file, "utf8");
    await downloadImageFiles(
      builder,
      file,
      fileContent,
      assetsDirectory,
      originUrls
    );
    await replaceOriginUrls(builder, file, fileContent, originUrls);
  }
  builder.log("Done with replacement of images from external sources");
}

/**
 * @param {any} builder
 * @param {string} filePath
 * @param {string} fileContent
 * @param {string} assetsDirectory
 * @param {string[]} originUrls
 */
async function downloadImageFiles(
  builder: any,
  filePath: string,
  fileContent: string,
  assetsDirectory: string,
  originUrls: string[]
) {
  for (let index = 0; index < originUrls.length; index++) {
    const originUrl = originUrls[index];
    const imageUrls = await findImageUrls(fileContent, originUrl, true);
    if (imageUrls.length > 0) {
      builder.log.minor(`Downloading images for file: ${filePath}`);
      for (
        let imageUrlIndex = 0;
        imageUrlIndex < imageUrls.length;
        imageUrlIndex++
      ) {
        const imageUrl = imageUrls[imageUrlIndex];
        await downloadImageFile(builder, imageUrl, assetsDirectory, originUrl);
      }
    }
  }
}

/**
 * @param {string} fileContent
 * @param {string} originUrl
 * @param {boolean} includeImageExtension
 */
async function findImageUrls(
  fileContent: string,
  originUrl: string,
  includeImageExtension = false
) {
  let imageUrlRegexString = originUrl.replace(/\//g, "(?:\\/|\\\\u002F)");
  imageUrlRegexString =
    imageUrlRegexString +
    (includeImageExtension ? "(?:.+?)(?:png|jpg|jpeg|gif))" : ")");
  imageUrlRegexString = "(" + imageUrlRegexString;
  const imageUrlRegex = new RegExp(imageUrlRegexString, "g");
  const imageUrls = [];
  let imageUrl;
  while ((imageUrl = imageUrlRegex.exec(fileContent))) {
    imageUrls.push(imageUrl[1]);
  }
  return imageUrls;
}

/**
 * @param {any} builder
 * @param {string} imageUrl
 * @param {string} assetsDirectory
 * @param {string} originUrl
 */
async function downloadImageFile(
  builder: any,
  imageUrl: string,
  assetsDirectory: string,
  originUrl: string
) {
  const cleanedImageUrl = imageUrl.replace(/\\u002F/g, "/");
  const buildImagePath = cleanedImageUrl.replace(
    originUrl,
    `${process.cwd()}/${assetsDirectory}/img`
  );
  const buildImagePathArray = buildImagePath.split("/");
  const fileName = buildImagePathArray[buildImagePathArray.length - 1];
  const newAssetPath = buildImagePath.replace(fileName, "");
  const q = url.parse(cleanedImageUrl, true);
  const options: https.RequestOptions = {
    hostname: q.hostname,
    port: q.port,
    path: q.path,
    method: "GET",
    headers: {
      "X-Forwarded-For": "xxx",
      "User-Agent":
        "Mozilla/5.0 (X11; CrOS x86_64 14324.80.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.102 Safari/537.36",
    },
  };

  await downloadFile(newAssetPath, buildImagePath, options);
  builder.log.minor(
    `Download complete: ${cleanedImageUrl}. File was added in ${buildImagePath}`
  );
}

/**
 * @param {string} newAssetPath
 * @param {string} buildImagePath
 * @param {https.RequestOptions} options
 * @return {Promise<any>} a promise of request
 */
async function downloadFile(
  newAssetPath: string,
  buildImagePath: string,
  options: https.RequestOptions
) {
  return new Promise((resolve, reject) => {
    mkdir(newAssetPath, { recursive: true }, async (error: unknown) => {
      if (error) throw error;
      const destination = createWriteStream(buildImagePath);
      const response = await performDownloadRequest(options);
      response.pipe(destination);
      destination.on("finish", resolve);
      destination.on("error", reject);
    });
  });
}

/**
 * Do a request with options provided.
 *
 * @param {RequestOptions} options
 * @return {Promise<any>} a promise of request
 */
async function performDownloadRequest(
  options: https.RequestOptions
): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = https.get(options);
    request.on("response", (response: unknown) => {
      resolve(response);
    });
    request.on("error", (error: unknown) => {
      reject(error);
    });
  });
}

/**
 * @param {Builder} builder
 * @param {string} filePath
 * @param {string} fileContent
 * @param {string[]} originUrls
 */
async function replaceOriginUrls(
  builder: any,
  filePath: string,
  fileContent: string,
  originUrls: string[]
) {
  for (let index = 0; index < originUrls.length; index++) {
    const originUrl = originUrls[index];
    const imageUrls = await findImageUrls(fileContent, originUrl);
    if (imageUrls.length > 0) {
      let replacedFileContent = fileContent;
      for (
        let imageUrlIndex = 0;
        imageUrlIndex < imageUrls.length;
        imageUrlIndex++
      ) {
        const imageUrl = imageUrls[imageUrlIndex];
        replacedFileContent = await replaceOriginUrl(
          imageUrl,
          replacedFileContent
        );
      }
      await writeFile(filePath, replacedFileContent);
      builder.log.minor(`Links updated in file: ${filePath}.`);
    }
  }
}

/**
 * @param {string} imageUrl
 * @param {string} fileContent
 */
async function replaceOriginUrl(imageUrl: string, fileContent: string) {
  const seperatorRegex = /\\u002F/g;
  const imgDirectory = seperatorRegex.test(imageUrl) ? "\\\\u002Fimg" : "/img";
  const replacedFileContent = fileContent.replace(imageUrl, imgDirectory);
  return replacedFileContent;
}

module.exports = replaceExternalImages;
