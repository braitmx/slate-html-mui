import { TSlatePlugin, TRenderElement } from "./plugin"
import { RenderElementProps } from "slate-react"
import React, { FC, createElement } from "react"
import {
  THtmlEditor,
  TFromHtmlElement,
  TToHtml,
  TFromHtml,
  createFromHtml,
  createToHtml,
  TPartialNode,
  TTagElement,
} from "./html"
import { Editor } from "slate"

type TSlatePluginatorInit = {
  editor: Editor
  plugins?: TSlatePlugin[]
}

export class SlatePluginator {
  editor: THtmlEditor
  private _plugins: TSlatePlugin[] = []
  private _plugins_RenderElement: TRenderElement[] = []
  private _plugins_fromHtmlElement: TFromHtmlElement[] = [createFromHtml(this)]
  private _plugins_toHtml: TToHtml[] = []

  constructor(init: TSlatePluginatorInit) {
    this.editor = init.editor as THtmlEditor
    this.editor.html = this
    this._plugins_toHtml.push(createToHtml(this))
    if (init.plugins) {
      init.plugins.forEach(this.addPlugin)
    }
  }

  addPlugin = (plugin: TSlatePlugin) => {
    this._plugins.push(plugin)
    if (plugin.RenderElement) {
      this._plugins_RenderElement.push(plugin.RenderElement)
    }
    if (plugin.extendEditor) {
      plugin.extendEditor(this.editor)
    }
    if (plugin.fromHtmlElement) {
      this._plugins_fromHtmlElement.push(plugin.fromHtmlElement)
    }
    if (plugin.toHtml) {
      this._plugins_toHtml.push(plugin.toHtml)
    }
  }

  RenderElement: FC<RenderElementProps> = props => {
    const Component = this._plugins_RenderElement.find(r => r(props))
    if (Component) {
      return createElement(Component, props)
    }
    console.warn("INVALID ELEMENT", props)
    return <p>INVALID ELEMENT</p>
  }

  fromHtmlElement = (
    element: HTMLElement | ChildNode
  ): (TTagElement | TPartialNode | any) | (TTagElement | TPartialNode | any)[] => {
    let node = null
    this._plugins_fromHtmlElement.some(from => {
      const _node = from(element, this)
      if (_node) {
        node = _node
        return true
      }
      return false
    })
    return node
  }

  toHtml = (node: TPartialNode) => {
    let el = ""
    this._plugins_toHtml.some(to => {
      const _el = to(node, this)
      if (_el) {
        el = _el
        return true
      }
      return false
    })
    return el
  }

  fromHtml: TFromHtml = html => {
    const parsed = new DOMParser().parseFromString(html, "text/html")
    return this.fromHtmlElement(parsed.body)
  }

  fromHtmlChildNodes = (nodes: NodeListOf<ChildNode> | HTMLCollection) => {
    return Array.from(nodes)
      .map(this.fromHtmlElement)
      .flat()
  }

  toHtmlgetChildren = (node: TPartialNode) => {
    const children =
      (Editor.isBlock(this.editor, node) || Editor.isInline(this.editor, node)) && node.children
        ? node.children.map(n => this.toHtml(n)).join("")
        : ""
    return children
  }
}