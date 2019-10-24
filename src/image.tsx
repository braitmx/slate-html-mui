import Image from "@material-ui/icons/Image"
import React, { createElement, FC } from "react"
import { Plugin } from "slate-react"
import { hasBlock } from "./block-html"
import { useSlateEditor } from "./editor"
import { ToolbarButton, TToolbarButtonProps } from "./toolbar-button"

export const IMAGE_TYPE = "img"

type TImgPluginOptions = {
  nodeType: string
}
export const CreateImgPlugin = (options: TImgPluginOptions): Plugin => {
  const { nodeType } = options
  const plugin: Plugin = {
    renderBlock: (props, _editor, next) => {
      const { attributes, children, node } = props
      if (node.type === options.nodeType) {
        const { data } = node
        const dataJson = data.toJS()
        return createElement(nodeType, { ...attributes, ...dataJson }, children)
      } else {
        return next()
      }
    },
  }
  return plugin
}

type TImgButtonProps = {
  isActive?: boolean
} & Omit<TToolbarButtonProps, "tooltipTitle">
export const ImgButton: FC<TImgButtonProps> = ({ isActive, ...rest }) => {
  const editor = useSlateEditor()

  if (isActive === undefined) {
    isActive = hasBlock(editor.value, IMAGE_TYPE)
  }

  return (
    <ToolbarButton
      tooltipTitle="Image"
      color={isActive ? "primary" : "default"}
      variant={isActive ? "contained" : "text"}
      // onClick={() => toggle(editor, blockType)}
      {...rest}
    >
      <Image />
    </ToolbarButton>
  )
}
