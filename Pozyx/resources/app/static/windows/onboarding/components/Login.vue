<template>
  <div>
    <img src="../../images/Logo-Pozyx-Only-Squared.png" style="width: 90%; max-width: 60px; margin: 0 auto 25px auto; display: block;" />

    <b-notification type="is-warning" v-if="errorMessage">
      {{ errorMessage }}
    </b-notification>

    <b-field
      style="margin-bottom: 20px;"
      :type="(triedSubmitting && !emailValid) ? 'is-danger' : ''"
      :message="(triedSubmitting && !emailValid) ? 'This is not a valid email address' : null"
    >
      <b-input
        placeholder="Email"
        type="text"
        icon="user fa-sm"
        icon-pack="fas"
        v-model="email"
        :disabled="loading"
        ref="email"
        @keyup.native.enter="logIn"
        @keyup.native="onEmailChanged"
      />
    </b-field>

    <b-field
      :type="(triedSubmitting && !passwordValid) ? 'is-danger' : ''"
      :message="(triedSubmitting && !passwordValid) ? 'This is not a valid password' : null"
    >
      <b-input
        placeholder="Password"
        type="password"
        icon="lock fa-sm"
        icon-pack="fas"
        v-model="password"
        :disabled="loading"
        @keyup.native.enter="logIn"
        @keyup.native="onPasswordChanged"
      />
    </b-field>

    <!--<p style="text-align: right; margin-top: -5px;">
      <a v-on:click="forgotPassword" :disabled="loading"><small>Forgot password</small></a>
    </p>-->

    <a @click="logIn" class="button is-primary" :class="{ 'is-loading': loading }" style="margin-top: 15px; width: 100%;" :disabled="loading">
      Log in
    </a>

    <p @click="goToRegister" style="text-align: center; margin-top: 20px;">
      <a>Create new account</a><br />
    </p>
  </div>
</template>

<script>
  import { post as postHttp } from 'axios';
  import SHA256 from 'crypto-js/sha256';

  import config from '../../config';
  import { set as setStore } from '../store';
  import focus from '../../util/focus';
  import { validateEmail } from '../../util/validate';

  export default {
    name: 'login',
    data () {
      return {
        email: '',
        password: '',
        loading: false,
        errorMessage: null,
        emailValid: false,
        passwordValid: false,
        triedSubmitting: false,
      };
    },
    mounted() {
      focus(this.$refs, 'email');
    },
    methods: {
      logIn() {
        if (this.loading) {
          return;
        }

        this.triedSubmitting = true;

        if (!this.emailValid || !this.passwordValid) {
          return;
        }

        this.loading = true;

        const hashedPassword = SHA256(this.password).toString();

        postHttp(`${config.protocol}://${config.authHost}:${config.authPort}`, {
          email: this.email,
          password: hashedPassword,
          // remember: true,
        }).then(({ data }) => {
          if (data.success) {
            this.loading = false;
            this.errorMessage = null;

            this.$toast.open({
              message: 'Successfully logged in!',
              type: 'is-success',
            });

            setStore('email', this.email);
            setStore('hashedPassword', hashedPassword);
            setStore('tenants', data.tenants);
            this.$router.push('/setup-select');

          } else {
            this.loading = false;
            this.errorMessage = data.message;
          }

        }).catch((err) => {
          this.loading = false;
          this.errorMessage = 'An unknown error occured';
        });
      },

      onEmailChanged(e) {
        this.emailValid = validateEmail(e.target.value);
      },

      onPasswordChanged(e) {
        this.passwordValid = e.target.value.length > 0;
      },

      goToRegister() {
        if (!this.loading) {
          this.$router.push('/register');
        }
      },
    }
  }
</script>
