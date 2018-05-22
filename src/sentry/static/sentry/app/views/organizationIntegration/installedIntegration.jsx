import {Box, Flex} from 'grid-emotion';
import PropTypes from 'prop-types';
import React from 'react';
import styled from 'react-emotion';

import {PanelItem, PanelAlert} from 'app/components/panels';
import {t} from 'app/locale';
import Button from 'app/components/buttons/button';
import Confirm from 'app/components/confirm';
import Switch from 'app/components/switch';
import Tooltip from 'app/components/tooltip';
import FieldFromConfig from 'app/views/settings/components/forms/fieldFromConfig';
import Form from 'app/views/settings/components/forms/form';

const IntegrationIcon = styled.img`
  height: 32px;
  width: 32px;
  border-radius: 3px;
  display: block;
`;

const IntegrationName = styled.div`
  font-size: 1.6rem;
  margin-bottom: 3px;
`;

const DomainName = styled.div`
  color: ${p => p.theme.gray3};
  font-size: 1.4rem;
`;

export default class InstalledIntegration extends React.Component {
  static propTypes = {
    orgId: PropTypes.string.isRequired,
    projectId: PropTypes.string,
    provider: PropTypes.object.isRequired,
    integration: PropTypes.object.isRequired,
    isEnabling: PropTypes.bool,
    onRemove: PropTypes.func.isRequired,
    onToggleEnabled: PropTypes.func,
  };

  constructor() {
    super();
    this.state = {configuring: false};
  }

  onConfigure = () => this.setState({configuring: !this.state.configuring});

  renderConfiguration() {
    const {integration} = this.props;
    const {config_project, config_organization} = integration;

    // Since integrations currently live under project settings, we have the
    // context needed to display both organizatoon-level integration
    // configuration, as well as project-level integration configuration. We
    // make the seperation clear with an alert for now.

    const formProps = {
      hideFooter: true,
      saveOnBlur: true,
      allowUndo: true,
      apiMethod: 'POST',
      dataTransformer: data => ({config: data}),
    };

    return (
      <React.Fragment>
        <Form
          {...formProps}
          initialData={integration.config_data_projects[this.props.projectId]}
          apiEndpoint={`/projects/${this.props.orgId}/${this.props
            .projectId}/integrations/${integration.id}/`}
        >
          {config_project.map(field => (
            <FieldFromConfig key={field.name} field={field} />
          ))}
        </Form>
        {config_organization.length > 0 && (
          <PanelAlert type="info">
            {t(
              'The following configurations are organization-scoped. Changing these will change the settings globally.'
            )}
          </PanelAlert>
        )}
        <Form
          {...formProps}
          initialData={integration.config_data}
          apiEndpoint={`/organizations/${this.props
            .orgId}/integrations/${integration.id}/`}
        >
          {config_organization.map(field => (
            <FieldFromConfig key={field.name} field={field} />
          ))}
        </Form>
      </React.Fragment>
    );
  }

  isEnabledForProject() {
    return (
      this.props.integration.config_data_projects[this.props.projectId] !== undefined
    );
  }

  hasConfiguration() {
    return (
      this.props.integration.config_project.length > 0 ||
      this.props.integration.config_organization.length > 0
    );
  }

  render() {
    const {integration} = this.props;
    const enabled = this.isEnabledForProject();

    return (
      <React.Fragment>
        <PanelItem p={0} py={2} key={integration.id} align="center">
          <Box pl={2}>
            <IntegrationIcon src={integration.icon} />
          </Box>
          <Box px={2} flex={1}>
            <IntegrationName>{integration.name}</IntegrationName>
            <DomainName>{integration.domain_name}</DomainName>
          </Box>
          <Flex mr={1}>
            <Tooltip title={t('Enable for this Project')}>
              <Switch
                size="lg"
                isLoading={this.props.isEnabling}
                isActive={enabled}
                toggle={() => this.props.onToggleEnabled(!enabled)}
              />
            </Tooltip>
          </Flex>
          {this.hasConfiguration() && (
            <Box mr={1}>
              <Button
                size="small"
                disabled={!this.isEnabledForProject()}
                priority={this.state.configuring ? 'primary' : undefined}
                onClick={this.onConfigure}
              >
                Configure
              </Button>
            </Box>
          )}
          <Box mr={1} pr={2}>
            <Confirm
              message={t(
                'Removing this inegration will disable the integration for all projects. Are you sure you want to remove this integration?'
              )}
              onConfirm={() => this.props.onRemove()}
            >
              <Button size="small">
                <span className="icon icon-trash" style={{margin: 0}} />
              </Button>
            </Confirm>
          </Box>
        </PanelItem>
        {this.state.configuring &&
          this.isEnabledForProject() &&
          this.renderConfiguration()}
      </React.Fragment>
    );
  }
}
