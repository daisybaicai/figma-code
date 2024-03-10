// This plugin will open a tab that indicates that it will monitor the current
// selection on the page. It cannot change the document itself.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

let parentId;
// This monitors the selection changes and posts the selection to the UI

const getJustifyContent = (node: any) => {
  switch (node.primaryAxisAlignItems) {
    case "MIN":
      return "flex-start";
    case "CENTER":
      return "center";
    case "MAX":
      return "flex-end";
    case "SPACE_BETWEEN":
      return "space-between";
  }
};

const getAlignItems = (node: any) => {
  switch (node.counterAxisAlignItems) {
    case "MIN":
      return "flex-start";
    case "CENTER":
      return "center";
    case "MAX":
      return "flex-end";
    case "BASELINE":
      return "baseline";
  }
};

const getFlexDirection = (node: any): string =>
  node.layoutMode === "HORIZONTAL" ? "row" : "column";

const convertColorToLess = (color: any) => {
  if (color.type === "SOLID") {
    if (color.color.a < 1) {
      // 如果透明度小于 1，生成 LESS 变量
      var rgbaValue =
        "rgba(" +
        Math.round(color.color.r * 255) +
        ", " +
        Math.round(color.color.g * 255) +
        ", " +
        Math.round(color.color.b * 255) +
        ", " +
        color.opacity +
        ")";
      return "@color: " + rgbaValue + ";";
    } else {
      // 如果透明度为 1，生成十六进制颜色值
      var hexValue =
        "#" +
        Math.round(color.color.r * 255).toString(16) +
        Math.round(color.color.g * 255).toString(16) +
        Math.round(color.color.b * 255).toString(16);
      return "@color: " + hexValue + ";";
    }
  } else if (color.type === "GRADIENT") {
    // 处理渐变色填充，根据具体需求进行转换
    // ...
    return "";
  } else {
    // 其他类型的填充，不处理
    return "";
  }
};

const getCssProperties = (node: any): any => {
  return {
    width: node.width,
    height: node.height,
    "padding-bottom": node.paddingBottom,
    "padding-left": node.paddingLeft,
    "padding-right": node.paddingRight,
    "padding-top": node.paddingTop,
    display: "flex",
    "flex-direction": getFlexDirection(node),
    "justify-content": getJustifyContent(node),
    "align-items": "flex-start",
    // "border-radius": "8px",
    // border: "2px solid #FFF",
    // background: "linear-gradient(180deg, #EBF0F6 0%, #FBFDFF 100%)",
    // "box-shadow": "0px 4px 32px 0px rgba(206, 219, 225, 0.30)",
  };
};

const getTextProperties = (node: any): any => {
  return {
    color: convertColorToLess(node.fills[0]),
    /* 24 B */
    "font-family": node.fontName.family,
    "font-size": node.fontSize + "px",
    "font-style": "normal",
    "font-weight": node.fontWeight,
    "line-height": node.lineHeight.value + "px" /* 133.333% */,
  };
};

const addProps = (node: any): any => {
  const type = node.type.toLowerCase();
  const id = node.id.split(";")?.[0]?.split(":")?.[1] || node.id;
  const classId = type + id;

  return {
    class: classId,
  };
};

const createTree = async (sceneNode: any, nodeTree: any = []) => {
  const sceneLen = sceneNode.length;

  console.log("getNode", sceneNode, JSON.stringify(sceneNode));

  for (const node of sceneNode) {
    const nodeType = node.type;
    const cssProps = await node.getCSSAsync();

    if (
      nodeType === "FRAME" ||
      nodeType === "INSTANCE" ||
      nodeType === "COMPONENT" ||
      nodeType === "GROUP"
    ) {
      const childrenTree = await createTree(node.children, []);
      if (node.layoutMode === "NONE") {
        let flexStyle: any = null;
        for (
          let childIndex = 0;
          childIndex < childrenTree.length;
          childIndex++
        ) {
          const xchildren = childrenTree.filter(
            (item: any) =>
              item.node.x === childrenTree[childIndex].node.x &&
              item.css.position !== "absolute"
          );
          if (
            ((flexStyle && flexStyle.children.length < xchildren.length) ||
              !flexStyle) &&
            xchildren.length > 1
          ) {
            flexStyle = {
              direction: "VERTICAL",
              children: xchildren,
            };
          }
          const ychildren = childrenTree.filter(
            (item: any) =>
              item.node.y === childrenTree[childIndex].node.y &&
              item.css.position !== "absolute"
          );
          if (
            ((flexStyle && flexStyle.children.length < ychildren.length) ||
              !flexStyle) &&
            ychildren.length > 1
          ) {
            flexStyle = {
              direction: "HORIZONTAL",
              children: ychildren,
            };
          }
        }
        if (flexStyle) {
          cssProps.display = "flex";
          if (flexStyle.direction === "VERTICAL") {
            cssProps.flexDirection = "column";
            childrenTree.sort((a: any, b: any) => {
              return a.node.y + a.node.height - (b.node.y + b.node.height);
            });
            childrenTree.forEach((child: any) => {
              if (child.dom === "span") child.css.textAlign = "left";
            });
            let lastNode: any = null;
            flexStyle.children.forEach((flexChild: any) => {
              const i = childrenTree.findIndex(
                (item: any) => item.node.id === flexChild.node.id
              );
              if (lastNode) {
                childrenTree[i].css.marginTop =
                  childrenTree[i].node.y -
                  (lastNode.y + lastNode.height) +
                  "px";
              }
              lastNode = childrenTree?.[i].node;
            });
          } else {
            childrenTree.sort((a: any, b: any) => {
              return a.node.x + a.node.width - (b.node.x + b.node.width);
            });
            let lastNode: any = null;
            flexStyle.children.forEach((flexChild: any) => {
              const i = childrenTree.findIndex(
                (item: any) => item.node.id === flexChild.node.id
              );
              if (lastNode) {
                childrenTree[i].css.marginTop =
                  childrenTree[i].node.x - (lastNode.x + lastNode.width) + "px";
              }
              lastNode = childrenTree?.[i].node;
            });
          }
          cssProps.paddingLeft =
            Math.min(...flexStyle.children.map((child: any) => child.node.x)) +
            "px";
          cssProps.paddingTop =
            Math.min(...flexStyle.children.map((child: any) => child.node.y)) +
            "px";
        }
        childrenTree.forEach((child: any) => {
          if (
						child.css.position !== "absolute" &&
						(!flexStyle ||
							flexStyle.children.every(
								(i: any) => i.node.id !== child.node.id
							)) &&
						(child.node.x != 0 || child.node.y != 0)
					) {
						child.css.position = "absolute";
						child.css.left = child.node.x + "px";
						child.css.top = child.node.y + "px";
						if (!cssProps.position) {
							cssProps.position = "relative";
						}
					}
        });
      }

      const dom = {
        css: cssProps,
        children: childrenTree,
        dom: "div",
        node: node,
        ...addProps(node),
      };
      nodeTree.push(dom);
    }

    if (nodeType === "RECTANGLE") {
      const dom = {
        css: cssProps,
        dom: "div",
        node: node,
        ...addProps(node),
      };
      nodeTree.push(dom);
    }

    if (nodeType === "TEXT") {
      const dom = {
        css: cssProps,
        text: node.characters.split("\n").join("<br/>"),
        dom: "span",
        node: node,
        ...addProps(node),
      };
      const nodeText = node.getSharedPluginData("builder", "data");
      // console.log("🚀 ~ file: code.ts:373 ~ createTree ~ nodeText:", nodeText);

      // css不需要计算 figma自动提供了相关方法，直接通过getCSSAsync 来获取
      // console.log("🚀 ~ file: code.ts:372 ~ createTree ~ cssProps:", cssProps);
      nodeTree.push(dom);
    }
  }

  return nodeTree;
};

function convertToInlineStyle(cssStyles: any) {
  const inlineStyles = {};
  let resultStr = "";

  Object.keys(cssStyles).forEach((property, index, arr) => {
    let styleValue = cssStyles[property];
    let properLabel = property;

    // 处理一些特殊情况，例如属性名包含连字符的情况
    if (property.includes("-")) {
      const words = property.split("-");
      properLabel = words
        .map((word, index) =>
          index > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
        )
        .join("");
    }

    // 将属性名和属性值添加到行内样式对象中
    //@ts-ignore
    inlineStyles[properLabel] = styleValue;
    resultStr += `${properLabel}:"${styleValue}"${
      index !== arr.length - 1 ? "," : ""
    }`;
  });
  return resultStr;
}

// 转换驼峰式属性名为连字符式
function convertCamelCaseToDash(str: string) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function formatLess(lessString: string) {
  let result = lessString;

  // 1. 将var(--, value) -> value
  const regex = /var\(--,\s*([^)]+)\)/g;
  result = lessString.replace(regex, "$1");

  // 2. 处理在上面特殊处理的cssProps，之前是驼峰的全部转成-形式
  result = result.replace(/\b[a-zA-Z]+(?=:)/g, (match) => convertCamelCaseToDash(match));

  return result;
}

function convertToClassStyle(cssStyles: any) {
  let resultStr = "";
  Object.keys(cssStyles).forEach((property, index, arr) => {
    let styleValue = cssStyles[property];
    let properLabel = property;
    resultStr += `${properLabel}: ${styleValue};`;
  });
  return resultStr;
}

const getJsx = (str: any) => {
  let result = "";
  let lessResult = "";

  str.forEach((item: any) => {
    const tag = item.dom;
    const className = item.class;

    let totalResult = "";
    let totalLess = "";
    totalResult += `<${tag} className={styles.${className}}>`;
    totalLess += `.${className}{
      ${convertToClassStyle(item.css)}
    `;
    if (item.children) {
      totalResult += getJsx(item.children).jsx;
      totalLess += getJsx(item.children).less;
    }
    if (tag === "span") {
      totalResult += item.text;
    }

    totalResult += `</${tag}>`;
    totalLess += `}`;

    result += totalResult;
    lessResult += totalLess;
  });

  return {
    jsx: result,
    less: lessResult,
  };
};

if (figma.currentPage.selection.length > 0) {
  parentId = figma.currentPage.selection[0].parent?.id ?? "";
}

figma.on("selectionchange", async () => {
  const result = await createTree(figma.currentPage.selection, []);
  console.log(result);

  let { jsx, less } = getJsx(result);

  // less二次处理
  less = formatLess(less);

  console.log("🚀 ~ file: code.ts:432 ~ figma.on ~ jsx:", jsx);
  console.log("🚀 ~ file: code.ts:351 ~ figma.on ~ less:", less);

  figma.ui.postMessage(figma.currentPage.selection);
});

// figma.closePlugin();
