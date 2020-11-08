import { Diagnostic, DiagnosticCollection, DiagnosticSeverity, languages, Range, TextDocument } from 'vscode';
import { ALXmlDocDiagnosticCode, ALXmlDocDiagnosticPrefix } from '../types';
import { ALObject } from '../types/ALObject';
import { ALObjectType } from '../types/ALObjectType';
import { ALProcedure } from '../types/ALProcedure';
import { XMLDocumentationExistType } from '../types/XMLDocumentationExistType';
import { ALSyntaxUtil } from './ALSyntaxUtil';
import { ALDocCommentUtil } from './ALDocCommentUtil';
import { Configuration } from './Configuration';
import { StringUtil } from './StringUtil';
import * as fs from 'fs';

export class ALCheckDocumentation {
    /**
     * Collection to store all gathered diagnostics.
     */
    private static diagCollection: DiagnosticCollection = languages.createDiagnosticCollection(ALXmlDocDiagnosticPrefix);
    
    /**
     * Gathered diagnostics.
     */
    private static diags: Diagnostic[] = [];

    /**
     * Actual AL Source Code file.
     */
    private static document: any;

    /**
     * AL Object.
     */
    private static alObject: ALObject | null = null;

    /**
     * Check documentation for passed TextDocument.
     * @param document {TextDocument}
     */
    public static CheckDocumentationForDocument(document: TextDocument) {
        this.document = document;

        this.CheckDocumentation();
    }

    /**
     * Check documentation for passed AL Object.
     * @param alObject {ALObject}
     */
    public static CheckDocumentationForALObject(alObject: ALObject) {
        this.document = Object.assign({});
        this.document.getText = () => fs.readFileSync(`${alObject.Path}/${alObject.FileName}`, 'utf8');
        this.document.fileName = `${alObject.Path}/${alObject.FileName}`;
        this.document.uri = alObject.Uri;

        this.alObject = alObject;

        this.CheckDocumentation();
    }

    /**
     * General documentation check procedure.
     */
    private static CheckDocumentation() {
        if (!Configuration.ProcedureDocumentationCheckIsEnabled(this.document.uri)) {
            return;
        }

        this.Initialize();

        if (this.alObject === null) {
            return;
        }
        this.alObject.Procedures?.forEach(alProcedure => {
            this.AnalyzeProcedureDocumentation(this.alObject, alProcedure);
        });
        
        this.AnalyzeUnnecessaryDocumentation(this.alObject, this.document);
        
        this.UpdateDiagnosticCollection();
    }

    /**
     * Initialize documentation check and clear previously reported diagnostics.
     */
    private static Initialize() {
        // clear all diagnostics
        this.diags = [];
        this.UpdateDiagnosticCollection();

        if (this.alObject === null) {
            this.alObject = ALSyntaxUtil.GetALObject(this.document);
        }
    }
    
    /**
     * Analyze source code for unnecessary XML documentations.
     * @param alObject ALObject
     * @param document TextDocument
     */
    private static AnalyzeUnnecessaryDocumentation(alObject: ALObject | null, document: TextDocument) {
        if (alObject === null) {
            return;
        }
        let i = 0;
        try {
            let codeLines: string[] = ALSyntaxUtil.SplitALCodeToLines(document.getText());
            let xmlDocumentation: string = '';
            for(i = 0; i < codeLines.length; i++) {
                let line: string = codeLines[i];
                if (!line.trim().startsWith('///')) {
                    if (xmlDocumentation !== '') {
                        let alProcedure: ALProcedure | undefined = alObject.Procedures?.find(alProcedure => (i <= alProcedure.LineNo));
                        if (alProcedure === undefined) {
                            console.debug(`Could not find AL Procedure for XML documentation found in ${alObject.FileName} line ${i}.`);
                            continue;
                        }
                        this.GetUnnecessaryProcedureDocumentationDiagnostics(codeLines, i, xmlDocumentation, alObject, alProcedure);
                    }
                    xmlDocumentation = '';
                    continue;
                }

                xmlDocumentation += line.trim().replace('///','');
            }
        } catch (ex) {
            console.debug(`An error occurred in ${alObject.FileName} during analyze unnecessary documentations.\r\n${ex}`);
        }
    }

    /**
     * Analyze procedure for unnecessary XML documentations.
     * @param codeLines AL Source Code.
     * @param currentLineNo Actual line no. in AL Source Code.
     * @param xmlDocumentation Captured XML documentation.
     * @param alObject ALObject
     * @param alProcedure ALProcedure
     */
    private static GetUnnecessaryProcedureDocumentationDiagnostics(codeLines: string[], currentLineNo: number, xmlDocumentation: string, alObject: ALObject, alProcedure: ALProcedure) {
        // convert to JSON to make it more accessible 
        let jsonDocumentation = ALDocCommentUtil.GetJsonFromXmlDocumentation(xmlDocumentation);
        if (!jsonDocumentation.param) {
            return;
        }

        let unnecessaryParameters: Array<string> = [];

        if (jsonDocumentation.param.length) { // multiple parameters
            for (let i = 0; i < jsonDocumentation.param.length; i++) {
                this.GetUnnecessaryParameterDocumentationDiagnostics(unnecessaryParameters, jsonDocumentation.param[i], alProcedure);
            }
        } else { // one parameter
            this.GetUnnecessaryParameterDocumentationDiagnostics(unnecessaryParameters, jsonDocumentation.param, alProcedure);
        }

        if (unnecessaryParameters.length !== 0) {
            let message = '';
            unnecessaryParameters.forEach(parameter => {
                message = StringUtil.AppendString(message, `'${parameter}'`, ', ');

                let paramRange: Range = alProcedure.Range!;
                for (let i = currentLineNo; i >= 0; i--) {
                    if (codeLines[i].indexOf(`/// <param name="${parameter}">`) !== -1) {
                        paramRange = ALSyntaxUtil.GetRange(codeLines.join('\r\n'), i);
                        break;
                    }
                }

                message = `The parameter ${parameter} is described in XML documentation for procedure ${alProcedure.Name}, but do not exist in procedure signature.`;
                let diagnostic = new Diagnostic(paramRange,
                    message, 
                    Configuration.GetProcedureDocumentationCheckInformationLevel(alObject.Uri));
                diagnostic.source = ALXmlDocDiagnosticPrefix;
                diagnostic.code = this.GetDiagnosticCode(ALXmlDocDiagnosticCode.ParameterUnnecessary);
    
                this.diags.push(diagnostic);
            });
        }
    }

    /**
     * Search for documented parameter in ALProcedure and add to array if unnecessary.
     * @param unnecessaryParameters Array<string> to collect unnecessary parameters.
     * @param param Documented parameter
     * @param alProcedure ALProcedure
     */
    private static GetUnnecessaryParameterDocumentationDiagnostics(unnecessaryParameters: Array<string>, param: { value: string, attr: { name: string }}, alProcedure: ALProcedure) {
        if (alProcedure.Parameters.find(alParameter => (alParameter.Name === param.attr.name)) === undefined) {
            unnecessaryParameters.push(param.attr.name);
        }
    }

    /**
     * Analyse documentation of the given procedure.
     * @param alObject {ALObject}
     * @param alProcedure {ALProcedure}
     */
    private static AnalyzeProcedureDocumentation(alObject: ALObject | null, alProcedure: ALProcedure) {
        if (alObject === null) {
            return;
        }

        let diag: { 
            type: DiagnosticSeverity, 
            diagnosticCode: ALXmlDocDiagnosticCode,
            element: string,
            range: Range | undefined
        }[] = [];

        if (alProcedure.XmlDocumentation.Exists !== XMLDocumentationExistType.Inherit) {
            if (alProcedure.XmlDocumentation.Exists === XMLDocumentationExistType.No) {
                diag.push({
                    type: DiagnosticSeverity.Warning,
                    diagnosticCode: ALXmlDocDiagnosticCode.SummaryMissing,
                    element: 'summary',
                    range: alProcedure.Range
                });
            }

            alProcedure.Parameters?.forEach(alParameter => {
                if (alParameter.XmlDocumentation.Exists === XMLDocumentationExistType.No) {
                    diag.push({
                        type: DiagnosticSeverity.Warning,
                        diagnosticCode: ALXmlDocDiagnosticCode.ParameterMissing,
                        element: `${alParameter.Name}`,
                        range: alProcedure.Range
                    });
                }
            });

            if (alProcedure.Return?.XmlDocumentation.Exists === XMLDocumentationExistType.No) {
                diag.push({
                    type: DiagnosticSeverity.Warning,
                    diagnosticCode: ALXmlDocDiagnosticCode.ReturnTypeMissing,
                    element: `${((alProcedure.Return.Name !== '') ? ` '${alProcedure.Return.Name}'` : '')}`,
                    range: alProcedure.Range
                });
            }
        } else {
            if ((alObject === null) || (alObject.ExtensionObject === undefined)) {
                return;
            }
            let inheritALObject: ALObject | null = ALSyntaxUtil.GetALObjectFromCache(ALObjectType.Interface, alObject.ExtensionObject);
            if (inheritALObject === null) {
                return;
            }
            let inheritALProcedure: ALProcedure | undefined = inheritALObject.Procedures?.find(inheritALProcedure => (inheritALProcedure.Name === alProcedure.Name));
            if (inheritALProcedure !== undefined) {
                this.AnalyzeProcedureDocumentation(inheritALObject, inheritALProcedure);
            }
        }       

        let missingDoc = diag.filter(this.IsMissingDocumentationDiag);
        if ((missingDoc !== undefined) && (missingDoc.length > 0)) {
            let msg: string = '';
            let code: string = '';
            if (missingDoc[0].diagnosticCode !== ALXmlDocDiagnosticCode.XmlDocumentationMissing) {
                missingDoc.forEach(diag => {
                    switch (diag.diagnosticCode) {
                        case ALXmlDocDiagnosticCode.ParameterMissing:
                            diag.element = `parameter '${diag.element}'`;
                        break;
                        case ALXmlDocDiagnosticCode.ReturnTypeMissing:
                            diag.element = `return value${(diag.element !== '') ? '\'' + diag.element + '\'' : ''}`;
                        break;
                    }
                    msg = StringUtil.AppendString(msg, diag.element, ', ');
                    code = StringUtil.AppendString(code, this.GetDiagnosticCode(diag.diagnosticCode), ', ');
                });

                msg = `The procedure ${alProcedure.Name} is missing documentation for ${msg}.`;
            } else {
                code = this.GetDiagnosticCode(missingDoc[0].diagnosticCode);
                msg = `The procedure ${alProcedure.Name} missing documentation.`;
            }
            let diagnostic = new Diagnostic(alProcedure.Range!, msg, Configuration.GetProcedureDocumentationCheckInformationLevel(alObject.Uri));
            diagnostic.source = ALXmlDocDiagnosticPrefix;
            diagnostic.code = code;

            this.diags.push(diagnostic);
        }
    }

    /**
     * Returns diagnostics string.
     * @param diagnosticCode {ALXmlDocDiagnosticCode}
     */
    private static GetDiagnosticCode(diagnosticCode: ALXmlDocDiagnosticCode): any {
        return diagnosticCode.toString();
    }

    /**
     * Returns true if actual diagnostic code is representing a missing documentation.
     */
    private static IsMissingDocumentationDiag(element: { diagnosticCode: ALXmlDocDiagnosticCode; }, index: any, array: any) {
        return (
            (element.diagnosticCode === ALXmlDocDiagnosticCode.XmlDocumentationMissing) || 
            (element.diagnosticCode === ALXmlDocDiagnosticCode.SummaryMissing) ||
            (element.diagnosticCode === ALXmlDocDiagnosticCode.ParameterMissing) || 
            (element.diagnosticCode === ALXmlDocDiagnosticCode.ReturnTypeMissing));
    }

    /**
     * Returns true if actual diagnostic code is representing a unnecessary documentation.
     */
    private static IsUnnecessaryDocumentationDiag(element: { diagnosticCode: ALXmlDocDiagnosticCode; }, index: any, array: any) {
        return ((element.diagnosticCode === ALXmlDocDiagnosticCode.ParameterUnnecessary));
    }

    /**
     * Update DiagnosticCollection to present them to the user.
     */
    private static UpdateDiagnosticCollection() {
        if (this.diags === []) {
            this.diagCollection.clear();
            return;
        }
        
        this.diagCollection.set(this.document.uri, this.diags);
    }

}