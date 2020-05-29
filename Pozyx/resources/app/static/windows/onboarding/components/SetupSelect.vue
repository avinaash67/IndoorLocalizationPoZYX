<template>
  <div>
    <b-notification type="is-warning" v-if="errorMessage">
      {{ errorMessage }}
    </b-notification>

    <h1 class="title is-4" style="text-align: center; margin-bottom: 20px;">Give your setup a name</h1>

    <b-field>
      <b-input
        placeholder="Feeling creative?"
        type="text"
        v-model="name"
        :disabled="loading"
        autofocus
        ref="name"
        @keyup.native.enter="createTenant"
        expanded
      />

      <p class="control">
        <button @click="createTenant" class="button is-primary" :class="{ 'is-loading': loading && !loadingId }">
          <i class="fas fa-play"></i>
        </button>
      </p>
    </b-field>

    <div v-if="tenants && tenants.length" style="margin-top: 50px;">
      <h2 class="title is-5" style="text-align: center; margin-bottom: 30px;">Or choose an existing setup...</h2>
      <p class="subtitle is-6" style="text-align: center; margin-bottom: 20px;"><i class="fas fa-exclamation-triangle" style="color: orange;"></i> Only reuse a setup if it's inactive</p>

      <a
        class="button"
        :class="{ 'is-loading': loading && loadingId === tenant.id }"
        v-for="tenant in tenants"
        :key="tenant.id"
        @click="() => selectTenant(tenant.id)"
        style="display: block; width: 100%; margin-bottom: 15px;"
      >
        {{ tenant.name }}
      </a>
    </div>

    <p style="text-align: center; margin-top: 50px;">
      <a @click="goBack">&lt; Back</a><br />
    </p>
  </div>
</template>

<script>
  import { post as postHttp } from 'axios';
  import { ipcRenderer } from 'electron';
  import log from 'electron-log';

  import focus from '../../util/focus';
  import { get as getStore } from '../store';
  import config from '../../config';

  export default {
    name: 'setup-select',
    data () {
      let tenants = null;
      if (getStore('tenants')) {
        tenants = getStore('tenants').filter((t) => t.role === 'OWNER');
      }

      return {
        name: '',
        tenants,
        loading: false,
        loadingId: null,
        errorMessage: null,
      };
    },
    mounted() {
      focus(this.$refs, 'name');
    },
    methods: {
      createTenant() {
        if (this.loading) {
          return;
        }

        if (!this.name || !this.name.trim().length) {
          return;
        }

        this.loading = true;

        // First log in
        postHttp(`${config.protocol}://${config.authHost}:${config.authPort}`, {
          email: getStore('email'),
          password: getStore('hashedPassword'),
          remember: true,
        }).then(({ data }) => {
          if (data.success) {
            const { refreshToken, accessToken } = data;

            // Then create tenant
            return postHttp(
              `${config.protocol}://${config.apiHost}:${config.apiPort}/tenants/setup`,
              { name: this.name.trim() },
              { headers: { Authorization: `JWT ${accessToken}` } },
            ).then(({ data }) => {
              const tenantId = data._id;

              // Then authenticate gateway-api
              return postHttp('http://localhost:4000/authenticate', {
                email: getStore('email'),
                password: getStore('hashedPassword'),
                tenantId,
              }).then((resp) => {
                this.loading = false

                ipcRenderer.send('open-window', {
                  windowName: 'app-window',
                  tenantId,
                  refreshToken,
                });

                ipcRenderer.send('close-window', {
                  windowName: 'onboarding',
                });
              });
            });

          } else {
            this.loading = false;
            this.errorMessage = data.message;
          }
        }).catch((err) => {
          log.error(err);
          this.loading = false;
          this.errorMessage = 'An unknown error occured';
        });
      },

      selectTenant(tenantId) {
        if (this.loading) {
          return;
        }

        this.loading = true;
        this.loadingId = tenantId;

        // First log in
        postHttp(`${config.protocol}://${config.authHost}:${config.authPort}`, {
          email: getStore('email'),
          password: getStore('hashedPassword'),
        }).then(({ data }) => {
          if (data.success) {
            const { refreshToken, accessToken } = data;

            // Then authenticate gateway-api
            return postHttp('http://localhost:4000/authenticate', {
              email: getStore('email'),
              password: getStore('hashedPassword'),
              tenantId,
            }).then((resp) => {
              this.loading = false

              ipcRenderer.send('open-window', {
                windowName: 'app-window',
                tenantId,
                refreshToken,
              });

              ipcRenderer.send('close-window', {
                windowName: 'onboarding',
              });
            });
          } else {
            this.loading = false;
            this.errorMessage = data.message;
          }
        }).catch((err) => {
          log.error(err);
          this.loading = false;
          this.errorMessage = 'An unknown error occured';
        });
      },

      goBack() {
        if (!this.loading) {
          this.$router.push('/');
        }
      },
    }
  }
</script>
