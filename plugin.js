export default function(babel) {
  const { types: t } = babel;

  let nativeDomHelpersImports = [];
  let importedFindAll;
  let findAllName = "findAll";

  return {
    name: "ast-transform", // not required
    visitor: {
      Program: {
        exit(program) {
          if (importedFindAll) {
            return;
          }

          if (nativeDomHelpersImports.length === 0) {
            program.node.body.unshift(
              t.importDeclaration(
                [
                  t.importSpecifier(
                    t.identifier("findAll"),
                    t.identifier("findAll")
                  )
                ],
                t.stringLiteral("ember-native-dom-helpers")
              )
            );
          } else {
            nativeDomHelpersImports[0].node.specifiers.push(
              t.importSpecifier(
                t.identifier("findAll"),
                t.identifier("findAll")
              )
            );
          }
        }
      },

      ImportDeclaration(node) {
        let findAllSpecifier;

        const isMatch = looksLike(node, {
          node: {
            specifiers: function(specifiers) {
              const findAll = specifiers.find(specifier =>
                looksLike(specifier, {
                  type: "ImportSpecifier",
                  imported: {
                    type: "Identifier",
                    name: "findAll"
                  },
                  local: {
                    type: "Identifier",
                    name: {}
                  }
                })
              );

              if (findAll) {
                findAllSpecifier = findAll;
                findAllName = findAll.local.name;
              }

              return true;
            },
            source: {
              type: "StringLiteral",
              value: "ember-native-dom-helpers"
            }
          }
        });

        if (!isMatch) {
          return;
        }

        nativeDomHelpersImports.push(node);
        if (findAllSpecifier) {
          importedFindAll = findAllSpecifier;
        }
      },

      ExpressionStatement(node) {
        let selectors, length, origArguments;

        const isMatch = looksLike(node, {
          node: {
            expression: {
              type: "CallExpression",
              arguments: function(args) {
                length = args[0];
                return true;
              },
              callee: {
                type: "MemberExpression",
                property: {
                  type: "Identifier",
                  name: n => n === "length" || n === "lengthOf"
                },
                object: {
                  type: "MemberExpression",
                  property: {
                    type: "Identifier",
                    name: "have"
                  },
                  object: {
                    type: "MemberExpression",
                    property: {
                      type: "Identifier",
                      name: "to"
                    },
                    object: {
                      type: "CallExpression",
                      arguments: function(args) {
                        origArguments = args;
                        return looksLike(args[0], {
                          type: "CallExpression",
                          callee: {
                            type: "MemberExpression",
                            object: {
                              type: "ThisExpression"
                            },
                            property: {
                              type: "Identifier",
                              name: "$"
                            }
                          },
                          arguments: function(args) {
                            const [selector] = args;
                            selectors = args;

                            try {
                              if (
                                selector &&
                                selector.value &&
                                selector.value.indexOf(":") > -1
                              ) {
                                return false;
                              } else {
                                return true;
                              }
                            } catch (e) {
                              return false;
                            }
                          }
                        });
                      },
                      callee: {
                        type: "Identifier",
                        name: "expect"
                      }
                    }
                  }
                }
              }
            }
          }
        });

        if (!isMatch) {
          return;
        }

        origArguments[0] = t.callExpression(
          t.identifier(findAllName),
          selectors.length ? selectors : [t.StringLiteral("")]
        );
      }
    }
  };
}

function looksLike(a, b) {
  return (
    a &&
    b &&
    Object.keys(b).every(bKey => {
      const bVal = b[bKey];
      const aVal = a[bKey];
      if (typeof bVal === "function") {
        return bVal(aVal);
      }
      return isPrimitive(bVal) ? bVal === aVal : looksLike(aVal, bVal);
    })
  );
}

function isPrimitive(val) {
  return val == null || /^[sbn]/.test(typeof val);
}
