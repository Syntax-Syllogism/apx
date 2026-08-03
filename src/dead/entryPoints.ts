import type { SymbolTable } from './types.js';

export const ENTRY_METHOD_ANNOTATIONS = [
  'AuraEnabled',
  'InvocableMethod',
  'RemoteAction',
  'NamespaceAccessible',
  'InvocableVariable',
  'HttpGet',
  'HttpPost',
  'HttpPut',
  'HttpPatch',
  'HttpDelete',
] as const;

export const ENTRY_INTERFACES = [
  'Database.Batchable',
  'System.Schedulable',
  'Schedulable',
  'System.Queueable',
  'Queueable',
  'Messaging.InboundEmailHandler',
  'System.Callable',
  'Callable',
  'Process.Plugin',
  'Auth.RegistrationHandler',
  'Database.RaisesPlatformEvents',
  'System.Comparator',
  'Iterable',
  'Iterator',
] as const;

const hasAnnotation = (annotations: Array<{ name: string }>, expected: string): boolean =>
  annotations.some((annotation) => annotation.name === expected);

export const isTestClass = (symbolTable: SymbolTable | null, name: string): boolean => {
  if (symbolTable) return hasAnnotation(symbolTable.tableDeclaration.annotations, 'IsTest');
  return /^Test/i.test(name) || /Test$/i.test(name);
};

const interfaceEntryPoint = (interfaces: string[]): string | null => {
  for (const iface of interfaces) {
    const simpleName = iface.slice(iface.lastIndexOf('.') + 1);
    if (ENTRY_INTERFACES.some((entry) => entry === iface || entry === simpleName)) return `implements ${iface}`;
  }
  return null;
};

const findEntryPoint = (symbolTable: SymbolTable): string | null => {
  if (symbolTable.tableDeclaration.modifiers.includes('global')) return 'global class';
  if (hasAnnotation(symbolTable.tableDeclaration.annotations, 'RestResource')) return '@RestResource';
  const interfaceReason = interfaceEntryPoint(symbolTable.interfaces);
  if (interfaceReason) return interfaceReason;

  for (const method of symbolTable.methods) {
    const annotation = method.annotations.find(({ name }) => ENTRY_METHOD_ANNOTATIONS.includes(name as never));
    if (annotation) return `@${annotation.name} method ${method.name}()`;
    if (method.modifiers.includes('webservice')) return `webservice method ${method.name}()`;
  }

  for (const innerClass of symbolTable.innerClasses) {
    const reason = findEntryPoint(innerClass);
    if (reason) return reason;
  }
  return null;
};

export const detectEntryPoint = (symbolTable: SymbolTable | null): string | null =>
  symbolTable ? findEntryPoint(symbolTable) : null;

export const describeDiShape = (symbolTable: SymbolTable | null): string | null => {
  if (!symbolTable) return null;
  if (symbolTable.interfaces.length) return `implements ${symbolTable.interfaces.join(', ')}`;
  if (symbolTable.parentClass) return `extends ${symbolTable.parentClass}`;
  return null;
};
