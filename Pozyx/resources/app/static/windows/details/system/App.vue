<template>
  <section class="section" style="padding-top: 1.5rem;">
    <div class="container is-fluid">
      <b-notification type="is-warning" v-if="message">
        {{ message }}
      </b-notification>

      <h1 class="title is-4 has-text-primary" style="margin-bottom: 10px;" v-if="coreDetails">
        <i class="fas fa-rss"></i> &nbsp;Pozyx device

        <a class="button is-small is-pulled-right" @click="refresh" :class="{ 'is-loading': refreshing }">
          Refresh
        </a>
      </h1>

      <p v-if="coreDetails && !deviceDetails" class="has-text-weight-light has-text-grey-light" style="margin-bottom: 30px;">No Pozyx device connected.</p>

      <table class="table is-hoverable is-narrow" v-if="deviceDetails" style="width: 100%;">
        <tbody>
          <tr>
            <th>ID</th>
            <td>{{ deviceDetails.id }}</td>
          </tr>
          <tr>
            <th>Hex ID</th>
            <td>{{ deviceDetails.hexId }}</td>
          </tr>
          <tr>
            <th>Firmware version</th>
            <td>{{ deviceDetails.fwVersion }}</td>
          </tr>
          <tr>
            <th style="width: 1px; padding-right: 50px; white-space: nowrap;">Hardware version</th>
            <td>{{ deviceDetails.hwVersion }}</td>
          </tr>
          <tr v-if="deviceDetails.settings">
            <th colspan="2">UWB settings</th>
          </tr>
          <tr v-if="deviceDetails.settings">
            <th class="has-text-weight-normal" style="padding-left: 20px;">Channel</th>
            <td>{{ deviceDetails.settings.uwb.channel }}</td>
          </tr>
          <tr v-if="deviceDetails.settings">
            <th class="has-text-weight-normal" style="padding-left: 20px;">Bitrate</th>
            <td>{{ deviceDetails.settings.uwb.bitrate }}</td>
          </tr>
          <tr v-if="deviceDetails.settings">
            <th class="has-text-weight-normal" style="padding-left: 20px;">PRF</th>
            <td>{{ deviceDetails.settings.uwb.prf }}</td>
          </tr>
          <tr v-if="deviceDetails.settings">
            <th class="has-text-weight-normal" style="padding-left: 20px;">Preamble length</th>
            <td>{{ deviceDetails.settings.uwb.plen }}</td>
          </tr>
          <tr v-if="deviceDetails.settings">
            <th class="has-text-weight-normal" style="padding-left: 20px;">Gain</th>
            <td>{{ deviceDetails.settings.uwb.gain }}</td>
          </tr>
        </tbody>
      </table>

      <h1 class="title is-4 has-text-primary" style="margin-bottom: 10px;" v-if="coreDetails"><i class="fas fa-bolt"></i> &nbsp;Core service</h1>

      <table class="table is-hoverable is-narrow" v-if="coreDetails" style="width: 100%;">
        <tbody>
          <tr>
            <th>Name</th>
            <td>{{ coreDetails.name }}</td>
          </tr>
          <tr>
            <th>Version</th>
            <td>{{ coreDetails.version }}</td>
          </tr>
          <tr>
            <th>Status</th>
            <td>{{ coreDetails.status }}</td>
          </tr>
        </tbody>
      </table>

      <h1 class="title is-4 has-text-primary" style="margin-bottom: 15px;"><i class="fas fa-info"></i> &nbsp;About</h1>
      <p>Pozyx Gateway v1.0.0</p>
      <p>© Pozyx 2018</p>
    </div>
  </section>
</template>

<script>
  import { get as getHttp } from 'axios';

  export default {
    name: 'details',
    data() {
      return {
        refreshing: false,
        message: null,
        coreDetails: null,
        deviceDetails: null,
      };
    },
    mounted() {
      this.loadDetails();
    },
    methods: {
      refresh() {
        if (this.refreshedTimeout) {
          clearTimeout(this.refreshedTimeout);
        }

        this.refreshing = true;

        setTimeout(() => {
          this.$toast.open({
            message: 'Refreshed!',
            type: 'is-success',
            position: 'is-bottom',
          });

          this.refreshedTimeout = null;
          this.refreshing = false;
        }, 300);

        this.loadDetails();
      },

      loadDetails() {
        getHttp('http://localhost:5000/v1.0/system')
          .then((response) => {
            if (response && response.data) {
              this.coreDetails = response.data;

              if (response.data.device) {
                this.message = null;

                const { id, hwVersion, fwVersion, settings } = response.data.device;

                this.deviceDetails = {
                  id,
                  hexId: `0x${Number(id).toString(16)}`,
                  hwVersion,
                  fwVersion,
                  settings,
                };

              } else {
                this.message = 'No Pozyx device connected';
                this.deviceDetails = null;

                // this.deviceDetails = {
                //   id: '912929',
                //   hexId: `0xaasdasd`,
                //   hwVersion: '1.0.0',
                //   fwVersion: '0.1.0',
                //   settings: {
                //     uwb: {
                //       channel: 5,
                //       bitrate: 122,
                //       pref: 122,
                //       plen: 12121,
                //       gain: 12123,
                //     },
                //   },
                // };
              }
            } else {
              this.message = 'No core service connected';
            }
          })
          .catch(() => {
            this.coreDetails = null;
            this.deviceDetails = null;
            this.message = `Error fetching system details`;
          });
      },
    },
  };
</script>
