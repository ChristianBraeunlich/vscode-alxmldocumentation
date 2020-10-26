import { ALObject } from "./types/ALObject";
import { workspace, window, ProgressLocation, RelativePattern, Uri, ExtensionContext } from "vscode";
import { readFile } from "fs-extra";
import { ALSyntaxUtil } from "./util/ALSyntaxUtil";
import { DoComment } from "./doComment";
import { RegisterProvider } from "./RegisterProvider";

export class Controller {
    /**
     * Constructor of Controller.
     * @param context ExtensionContext
     */
    constructor(context: ExtensionContext) {
        // initialize classes.
        const doComment = new DoComment();
        const doHover = new RegisterProvider();

        // add to subscriptions.
        context.subscriptions.push(doComment);
        context.subscriptions.push(doHover);
    }

    /**
     * Initialize AL XML Documentation.
     */
    public async Initialize() {
        try 
        {
            await window.withProgress({
                location: ProgressLocation.Window,
                title: 'AL XML Documentation initialization in progress...',
            }, async (progress, token) => {
                // TODO: Respect configuration
                let workspacePaths = workspace.workspaceFolders;
                if ((!workspacePaths) || (workspacePaths === undefined)) {
                    throw new Error("Workspace folders could not be retrieved.");
                }
    
                for (let validPath of workspacePaths) {
                    let allFiles = await workspace.findFiles(new RelativePattern(validPath, '**/*.al'), undefined, undefined, token);
                    let relevantFileTasks = allFiles.map(async (file: Uri) => {
                        let content = await readFile(file.fsPath, 'utf-8');
                        if (content.match(/(procedure)\s+(.*?)\(/gm)) {
                            return { uri: file, content: content };
                        }
    
                        return undefined;
                    });
                    let relevantFiles = await Promise.all(relevantFileTasks);
                    relevantFiles = relevantFiles.filter(f => f);
    
                    let tasks: Array<Promise<void>> = [];
                    let task = async (file: { uri: Uri, content: string }) => {
                        let document = Object.assign({});
                        document.getText = () => file.content;
                        document.fileName = file.uri.fsPath;
                        
                        let alObject: ALObject|null = ALSyntaxUtil.GetALObject(document as any);
                        if (alObject !== null) {
                            // TODO: Send diagnostics                            
                        }
                    };
                    let max = relevantFiles.length;
                    for (let i = 0; i < max; i++) {
                        let file = relevantFiles[i];
                        tasks.push(task(file!));
    
                        if (i % 500 === 0) {
                            await Promise.all(tasks);
                            tasks = [];
                        }
                    }
    
                    if (tasks.length > 0) {
                        await Promise.all(tasks);
                    }
                }
    
                return true;
            });
        }
        catch (ex)
        {
            console.debug(ex);
        }
    }
}