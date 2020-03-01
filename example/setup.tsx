import { Editor } from "slate"
import { SlatePluginator } from "../src"
import { createImgPlugin } from "../src/image/img"
import { createButtonLinkPlugin } from "./button-link"
import { createPicturePlugin } from "../src/image/picture"
import { createAnchorPlugin } from "../src/link"

export const createPluginator = (editor: Editor) =>
  new SlatePluginator({
    editor,
    plugins: [
      createImgPlugin(),
      createPicturePlugin(),
      createAnchorPlugin(),
      createButtonLinkPlugin(),
    ],
  })