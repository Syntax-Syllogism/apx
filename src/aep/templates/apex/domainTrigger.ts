export const domainTrigger = `trigger <%= it.domainImplementationClassName %> on <%= it.apiName %> (after delete, after insert, after update, before delete, before insert, before update) {
  fflib_SObjectDomain.triggerHandler(<%= it.domainImplementationClassName %>.class);
}`;
