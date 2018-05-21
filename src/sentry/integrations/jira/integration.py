from __future__ import absolute_import

from django.utils.translation import ugettext_lazy as _

from sentry.integrations import Integration, IntegrationProvider, IntegrationMetadata
from sentry.integrations.exceptions import ApiError

from .client import JiraApiClient


alert_link = {
    'text': 'Visit the **Atlassian Marketplace** to install this integration.',
    # TODO(jess): update this when we have our app listed on the
    # atlassian marketplace
    'link': 'https://marketplace.atlassian.com/',
}

metadata = IntegrationMetadata(
    description='Sync Sentry and JIRA issues.',
    author='The Sentry Team',
    noun=_('Instance'),
    issue_url='https://github.com/getsentry/sentry/issues/new?title=JIRA%20Integration:%20&labels=Component%3A%20Integrations',
    source_url='https://github.com/getsentry/sentry/tree/master/src/sentry/integrations/jira',
    aspects={
        'alert_link': alert_link,
    },
)


class JiraIntegration(Integration):
    def get_project_config(self):
        configuration = [
            {
                'name': 'resolve_status',
                'type': 'choice',
                'allowEmpty': True,
                'label': _('JIRA Resolved Status'),
                'placeholder': _('Select a Status'),
                'help': _('Declares what the linked JIRA ticket workflow status should be transitioned to when the Sentry issue is resolved.'),
            },
            {
                'name': 'resolve_when',
                'type': 'choice',
                'allowEmpty': True,
                'label': _('Resolve in Sentry When'),
                'placeholder': _('Select a Status'),
                'help': _('When a JIRA ticket is transitioned to this status, trigger resolution of the Sentry issue.'),
            },
            {
                'name': 'sync_comments',
                'type': 'boolean',
                'label': _('Post Comments to JIRA'),
                'help': _('Synchronize comments from Sentry issues to linked JIRA tickets.'),
            },
            {
                'name': 'sync_forward_assignment',
                'type': 'boolean',
                'label': _('Synchronize Assignment to JIRA'),
                'help': _('When assiging something in sentry, the linked JIRA ticket will have the associated JIRA user assigned.'),
            },
            {
                'name': 'sync_reverse_assignment',
                'type': 'boolean',
                'label': _('Synchronize Assignment to Sentry'),
                'help': _('When assiging a user to a Linked JIRA ticket, the associated Sentry user will be assigned to the Sentry issue.'),
            },
        ]

        client = self.get_client()

        try:
            statuses = [(c['id'], c['name']) for c in client.get_valid_statuses()]
            configuration[0]['choices'] = statuses
            configuration[1]['choices'] = statuses
        except ApiError:
            # TODO(epurkhsier): Maybe disabling the inputs for the resolve
            # statuses is a little heavy handed. Is there something better we
            # can fall back to?
            configuration[0]['disabled'] = True
            configuration[1]['disabled'] = True

        return configuration

    def get_client(self):
        return JiraApiClient(
            self.model.metadata['base_url'],
            self.model.metadata['shared_secret'],
        )

    def get_issue(self, issue_id):
        client = self.get_client()
        issue = client.get_issue(issue_id)
        return {
            'title': issue['fields']['summary'],
            'description': issue['fields']['description'],
        }

    def create_comment(self, issue_id, comment):
        return self.get_client().create_comment(issue_id, comment)

    def search_issues(self, query):
        return self.get_client().search_issues(query)


class JiraIntegrationProvider(IntegrationProvider):
    key = 'jira'
    name = 'JIRA'
    metadata = metadata
    integration_cls = JiraIntegration

    can_add = False

    def get_pipeline_views(self):
        return []

    def build_integration(self, state):
        # Most information is not availabe during integration install time,
        # since the integration won't have been fully configired on JIRA's side
        # yet, we can't make API calls for more details like the server name or
        # Icon.
        return {
            'provider': 'jira',
            'external_id': state['clientKey'],
            'name': 'JIRA',
            'metadata': {
                'oauth_client_id': state['oauthClientId'],
                # public key is possibly deprecated, so we can maybe remove this
                'public_key': state['publicKey'],
                'shared_secret': state['sharedSecret'],
                'base_url': state['baseUrl'],
                'domain_name': state['baseUrl'].replace('https://', ''),
            },
        }
