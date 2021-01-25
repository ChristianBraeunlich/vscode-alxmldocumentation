# XML Documentation Comments Support for AL language in Visual Studio Code

Generate XML documentation comments for AL source code and create markdown documentation from it.

## Usage
### Generate context aware XML documentation comments

> **Note**<br>Due to the new [`Code documentation comments`](https://docs.microsoft.com/en-us/dynamics365-release-plan/2020wave2/smb/dynamics365-business-central/code-documentation-comments) feature released with Microsoft Dynamics 365 Business Central 2020 Release Wave 2 (17) we changed our default behavior to generate XML documentation comments.<br>For additional information please see [Setup](#Setup).

Type `///` in AL source code IntelliSense will suggest XML documentation comments, matching the context of your current position in source code.

![Generate context aware XML documentation comments][GenerateXmlDoc]

#### Inherit XML documentation comments
In case you're implementing an AL interface object you are able to use inherit XML documentation comments. Based on the accessibility of the interface object source code (`showMyCode`-flag) there are two additional comments available:
 - Inherit AL XML Documentation Comment<br>Creates a code reference (`cref`) linking to the original XML documentation comment in interface object. 
![Link inherit XML documentation comment from interface object][InheritXmlDoc]
 - AL XML Documentation Interface Comment<br>Copies the original XML documentation comment from the interface object.
![Apply XML documentation comment from interface object][InheritXmlDoc2]

> **Important**<br>Current version of markdown export does not support inherit documentation. This feature will be released in a future version.

### Additional documentation features
In addition to the regular documentation activity you can:
 - Add new lines in existing XML Documentation comment section. (`///` will automatically added.)
 - Use [Snippets](#Snippets) directly inside the XML Documentation comment section.

### Generate markdown files from XML documentation comments
There are two commands available to generate markdown files from XML documentation:

| Command | Description | 
| --- | --- |
| `AL DOC: Generate markdown documentation` | Create markdown documentation file for the currently opened AL source code file. |
| `AL DOC: Generate markdown documentation for directory` | Create markdown documentation files for all AL source code files in the currently opened directory. |

 <br>![Generate markdown files from XML documentation comments][GenerateMDDoc]

Generate markdown documentation files, based on the XML documentation in AL source code. For each object file (e.g. `MyCodeunit.Codeunit.al`) a subdirectory inside the export directory will be created.
Each procedure and trigger method is creating a single file (e.g. `DoSomething.al`) inside the subdirectory. Additionally an index file (`index.md`) will be created per object file and contains a list of every documented element in the source file.

### Show information from XML documentation comments as tooltip
After hovering over a procedure in your AL source code the XML documentation in the source file or symbols will be searched and presented as tooltip.
The following information will be displayed in tooltip:
 - Summary *(only for AL-version older 6.0)*
 - Returns
 - Remarks
 - Example, including syntax highlighted code-section.

![Show XML documentation summary as Tooltip][SummaryHover]

> **Important**<br>Due to possible accessibility limitations of symbol files (`showMyCode` in AL project `app.json`, etc.) it's not possible to retrieve the XML documentation comments for dependencies in this case.

### Diagnostic & Quick Fix actions
If `CheckProcedureDocumentationInformationLevel` or `CheckObjectDocumentationInformationLevel` configuration is set to other then `Disabled` every AL source file in current workspace will be checked for complete XML documentation.
Incomplete or missing documentations are added as diagnostic entries and providing quick fix actions to solve.

![Diagnostic & Quick Fix actions][DiagnosticsQuickFix]

#### Diagnostic Codes
Currently the following diagnostic codes and associated actions are implemented:

| Diagnostic Code | Description | Quick Fix Action |
| --- | --- | --- |
| DOC0001 | XML documentation for procedure is missing. | Add XML documentation |
| DOC0002 | `<summary>` documentation for procedure is missing. | Add summary XML documentation |
| DOC0010 | `<param>` documentation for procedure is missing. | Add parameter XML documentation |
| DOC0011 | `<param>` documentation exist but referred parameter does not exist. | Remove unnecessary parameter XML documentation. |
| DOC0020 | `<returns>` documentation for procedure is missing. | Add return value XML documentation |
| DOC0101 | XML documentation for object is missing. | Add XML documentation |

### Snippets
Three snippets are included into the extension:
#### Summary XML documentation
`docsummary` snippet adds simple `<summary>` xml documentation comment:
```c#
    /// <summary>
    /// This is the description of a specific procedure, trigger or object.
    /// </summary>
```
#### Example code XML documentation
`docexamplecode` snippet adds `<example>` xml documentation comment:
```c#
    /// <example>
    /// This is the description of an example
    /// <code>
    /// if (i <> y) then
    ///   DoSomething(i, y);
    /// </code>
    /// </example>
```
#### Remarks XML documentation
`docremarks` snippet adds `<remarks>` xml documentation comment:
```c#
    /// <remarks>
    /// This are some specific remarks for the documented procedure.
    /// </remarks>
```

## Installation
1. Install Visual Studio Code 1.44.0 or higher
2. Launch Visual Studio Code
3. From the extension view Ctrl-Shift-X (Windows, Linux) or Cmd-Shift-X (macOS)
4. Search and Choose the extension AL XML Documentation
5. Reload Visual Studio Code

## Setup
The menu under File > Preferences (Code > Preferences on Mac) provides entries to configure user and workspace settings. 

The following configuration parameters are available:

| Configuration Parameter | Description | Default Value |
| --- | --- | --- |
| `DocumentationBehavior` | Specifies the behavior for inserting the XML documentation comment after entering `///` in an AL source code file. | `IntelliSense` (standard behavior to respect AL language XML documentation feature) |
| `DocumentationExportPath` | Specifies the path where the created markdown documentation files should be stored. | `doc` folder in workspace root directory |
| `DocumentationExportVerbose` | Specifies whether detailed information should be output during markdown creation. | `false` |
| `CheckObjectDocumentationInformationLevel` | Specifies whether object documentations should be checked and undocumented objects reported. | `Information` | 
| `CheckProcedureDocumentationInformationLevel` | Specifies whether procedure documentations should be checked and undocumented procedures reported. | `Information` | 
| `CheckProcedureDocumentationForType` | Specifies the list of procedure types (e.g. event publisher, tests) to be checked. | `Global Procedures`<br>`Local Procedures`<br>`Internal Procedures`<br>`Protected Procedures`<br>`Event Publisher` |
| `CheckProcedureDocumentationForAccessLevel` | Specifies the accessibility level of the procedures to be checked for documentation and exported as markdown documentation files. | `Public` |
| `AskEnableCheckDocumentationForWorkspace` | Specifies whether a confirmation will appear to enable procedure documentation for each workspace. | `false` | 
| `InitializeALObjectCacheOnStartUp` | Specifies whether to analyse all AL objects in current workspace when or skip initialization. | `true` | 

> **Important**<br>The object directory for documentation (e.g. `doc\mycodeunit.codeunit.al\`) will be deleted if already exist.

![AL XML Documentation Setup][Setup]

### settings.json
```json 
{
    "al-xml-doc.CheckObjectDocumentationInformationLevel": "Disabled",
    "al-xml-doc.CheckProcedureDocumentationInformationLevel": "Error",
    "al-xml-doc.CheckProcedureDocumentationForType": [
        "Global Procedures",
        "Local Procedures",
        "Internal Procedures",
        "Protected Procedures",
        "Event Publisher"
    ],
    "al-xml-doc.CheckProcedureDocumentationForAccessLevel": [    
        "Public",
        "Internal",
        "Local"
    ]
}
```

> **Note**<br>`DocumentationExportPath` does support `${workspaceFolder}` as an placeholder.<br><br>_Example_<br>`"al-xml-doc.DocumentationExportPath": "${workspaceFolder}/documentations/src/"`<br><br>

## Supported Languages
This extension is only processing AL language source code files.

## Supported AL Keywords
| Object Type | Supported |
| --- | :---: |
| `procedure` | ![Supported] |
| `local procedure` | ![Supported] |
| `internal procedure` | ![Supported] |
| `trigger` | ![Supported] |

> **Note**<br>The purpose of the AL XML Documentation is to document your AL Source Code, not to document structures, controls or table fields.<br><br>Therefor it's currently not planned to add support for AL keywords, other the currently supported.

## Supported AL Objects
| Object Type | Supported |
| --- | :---: |
| `codeunit` | ![Supported] |
| `table` | ![Supported] |
| `page` | ![Supported] |
| `enum` | ![Supported] |
| `xmlport` | ![Supported] |
| `interface` | ![Supported] |
| `table extension` | ![Supported] |
| `page extension` | ![Supported] |
| `enum extension` | ![Supported] |
| `page customization` | ![NotSupport] |
| `profile` | ![NotSupport] |

## Supported Documentation XML Tags

| XML Tag | Supported |
| --- | :---: |
| `summary` | ![Supported] |
| `param` | ![Supported] |
| `returns` | ![Supported] |
| `remarks` | ![Supported] |
| `example` | ![Supported] |
| `inherit` | ![Supported] |

## System Requirements
 - Visual Studio Code 1.44.0 (or higher) - [Download here](https://code.visualstudio.com/Download)
 - .NET Core 3.0 (or higher) - [Download here](https://dotnet.microsoft.com/download/dotnet-core/3.0)

## License
This extension is licensed under the [MIT License](https://github.com/365businessdev/vscode-alxmldocumentation/blob/dev/LICENSE.txt).

## Known Issues

### 2020-01 - version 1.0.5
 - Updating AL Documentation Cache for Interface implementations is completely disabled, due to performance issues. Planned for next minor release 1.1.0.

[GenerateXmlDoc]: https://github.com/365businessdev/vscode-alxmldocumentation/blob/master/doc/V1.AddXmlDocComment.gif?raw=true "Generate context aware XML documentation comments"
[InheritXmlDoc]: https://github.com/365businessdev/vscode-alxmldocumentation/blob/master/doc/V1.AddInheritXmlDocComment.gif?raw=true "Link inherit XML documentation comment from interface object"
[InheritXmlDoc2]: https://github.com/365businessdev/vscode-alxmldocumentation/blob/master/doc/V1.AddInheritXmlDocComment2.gif?raw=true "Apply XML documentation comment from interface object"
[Setup]: https://github.com/365businessdev/vscode-alxmldocumentation/blob/master/doc/V1.Setup.png?raw=true "AL XML Documentation setup"
[GenerateMDDoc]: https://github.com/365businessdev/vscode-alxmldocumentation/blob/master/doc/GenerateMarkdownDoc.gif?raw=true  "Generate markdown files from XML documentation comments"
[SummaryHover]: https://github.com/365businessdev/vscode-alxmldocumentation/blob/master/doc/HoverProcedureDescription.gif?raw=true  "Generate markdown files from XML documentation comments"
[DiagnosticsQuickFix]: https://github.com/365businessdev/vscode-alxmldocumentation/blob/master/doc/ALCheckDocumentationDiagnosticsQuickFix.gif?raw=true  "Diagnostics and Quick Fix"
[Supported]: https://cdn4.iconfinder.com/data/icons/icocentre-free-icons/137/f-check_256-16.png "Supported"
[NotSupport]: https://cdn2.iconfinder.com/data/icons/circular%20icons/no.png "Not Supported"