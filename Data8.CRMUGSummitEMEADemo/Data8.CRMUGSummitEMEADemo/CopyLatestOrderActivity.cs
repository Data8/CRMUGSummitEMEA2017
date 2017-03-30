using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Metadata;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Workflow;
using System;
using System.Activities;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data8.CRMUGSummitEMEADemo
{
    public class CopyLatestOrderActivity : CodeActivity
    {
        [Output("New Order")]
        [ReferenceTarget("salesorder")]
        public OutArgument<EntityReference> NewOrder { get; set; }

        protected override void Execute(CodeActivityContext context)
        {
            var workflow = context.GetExtension<IWorkflowContext>();
            var orgFatory = context.GetExtension<IOrganizationServiceFactory>();
            var org = orgFatory.CreateOrganizationService(workflow.UserId);

            // We'll be run in the context of a contact, so no need to pass through that
            // ID as a separate parameter, just take it straight from the context
            var contactId = workflow.PrimaryEntityId;

            // Construct the query to find the latest order
            var qry = new QueryExpression("salesorder");
            qry.ColumnSet = new ColumnSet(true);
            qry.Criteria.AddCondition("customerid", ConditionOperator.Equal, contactId);
            qry.AddOrder("createdon", OrderType.Descending);
            qry.TopCount = 1;

            var lastOrder = org.RetrieveMultiple(qry).Entities.SingleOrDefault();

            // If they don't have any orders, raise an error
            if (lastOrder == null)
                throw new InvalidPluginExecutionException("No order to copy");

            // Get the list of attributes that are valid for create
            var orderAttrs = (RetrieveEntityResponse) org.Execute(new RetrieveEntityRequest { LogicalName = "salesorder", EntityFilters = Microsoft.Xrm.Sdk.Metadata.EntityFilters.Attributes });
            var newOrder = CopyEntity(lastOrder, orderAttrs.EntityMetadata);

            newOrder.Id = org.Create(newOrder);

            NewOrder.Set(context, newOrder.ToEntityReference());

            // Copy the order lines too
            var linesQry = new QueryByAttribute("salesorderdetail");
            linesQry.ColumnSet = new ColumnSet(true);
            linesQry.AddAttributeValue("salesorderid", lastOrder.Id);

            var lineAttrs = (RetrieveEntityResponse)org.Execute(new RetrieveEntityRequest { LogicalName = "salesorderdetail", EntityFilters = Microsoft.Xrm.Sdk.Metadata.EntityFilters.Attributes });

            foreach (var line in org.RetrieveMultiple(linesQry).Entities)
            {
                var newLine = CopyEntity(line, lineAttrs.EntityMetadata);
                newLine["salesorderid"] = newOrder.ToEntityReference();
                org.Create(newLine);
            }
        }

        private Entity CopyEntity(Entity entity, EntityMetadata metaData)
        {
            var newEntity = new Entity(entity.LogicalName);

            foreach (var attr in metaData.Attributes.Where(a => a.IsValidForCreate == true && entity.Contains(a.LogicalName) && a.LogicalName != metaData.PrimaryIdAttribute))
                newEntity[attr.LogicalName] = entity[attr.LogicalName];

            return newEntity;
        }
    }
}
