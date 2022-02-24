# sveltekit-pluggable-static-adapter-external-image-plugin
Plugin which replaces the URL's in build files from Sveltekit to a local variant. To be used with [@ivorgri/sveltekit-pluggable-static-adapter](https://www.npmjs.com/package/@ivorgri/sveltekit-pluggable-static-adapter). You need to provide the origin domain of the images to your website (this could be an array), followed with the builder, pages and assets attributes received from the callback hook. The function will take these URLs and start going through the generated files. Once it finds a complete link, including an image extension, it will download the files into the "img" folder inside the folder that provided for "assets". Once all the files are downloaded, the URL in the generated files with be replaced with a relative link to the "img" folder.

Be aware: the adapter looks for the base URL which is similar for ALL images. Any dynamic routing (i.e. date sub directories) are added to the "img" folder.

For example, if you have the following URL:

```https://your.domain.com/upload/folder/2022/02/02/image.jpg```

You should provide the following URL:

```https://your.domain.com/upload/folder```

The function will then create the following directory in the "img" folder:

```
img
└─── 2022
     └─── 02
          └─── 02
               |   image.jpg
```

The function should be called as follows:

```js
// svelte.config.js

// ...

import replaceExternalImages from '@ivorgri/sveltekit-pluggable-static-adapter-external-image-plugin';

//...

export default {
	kit: {
		adapter: adapter({
            // ...
            afterPrerenderCallback: async (builder, pages, assets) => {
				await replaceExternalImages("origin.domain.of.images.com",builder,pages,assets)
			},
		})
	}
};
```
