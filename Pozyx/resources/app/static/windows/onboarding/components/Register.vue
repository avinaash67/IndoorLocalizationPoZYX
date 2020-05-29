<template>
  <div>
    <img src="../../images/Logo-Pozyx-Only-Squared.png" style="width: 90%; max-width: 60px; margin: 0 auto 25px auto; display: block;" />

    <b-notification type="is-warning" v-if="errorMessage">
      {{ errorMessage }}
    </b-notification>

    <div style="margin-bottom: 20px; display: flex;">
      <b-field style="margin-bottom: 0; margin-right: 10px;">
        <b-input
          placeholder="First name"
          type="text"
          v-model="firstName"
          :disabled="loading"
          @keyup.native.enter="register"
          ref="firstName"
        />
      </b-field>

      <b-field style="margin-bottom: 0;">
        <b-input
          placeholder="Last name"
          type="text"
          v-model="lastName"
          :disabled="loading"
          @keyup.native.enter="register"
        />
      </b-field>
    </div>

    <b-field
      style="margin-bottom: 20px;"
      :type="(triedSubmitting && !emailValid) ? 'is-danger' : ''"
      :message="(triedSubmitting && !emailValid) ? 'This is not a valid email address' : null"
    >
      <b-input
        placeholder="Email"
        type="text"
        v-model="email"
        :disabled="loading"
        @keyup.native.enter="register"
        @keyup.native="onEmailChanged"
      />
    </b-field>

    <b-field
      style="margin-bottom: 20px;"
      :type="(triedSubmitting && !passwordValid) ? 'is-danger' : ''"
      :message="(triedSubmitting && !passwordValid) ? 'This is not a valid password' : null"
    >
      <b-input
        placeholder="Password"
        type="password"
        v-model="password"
        :disabled="loading"
        @keyup.native.enter="register"
        @keyup.native="onPasswordChanged"
      />
    </b-field>

    <b-field
      :type="(triedSubmitting && !password2Valid) ? 'is-danger' : ''"
      :message="(triedSubmitting && !password2Valid) ? 'Both passwords should be equal' : null"
    >
      <b-input
        placeholder="Confirm password "
        type="password"
        v-model="password2"
        :disabled="loading"
        @keyup.native.enter="register"
        @keyup.native="onPassword2Changed"
      />
    </b-field>

    <a @click="register" class="button is-primary" :class="{ 'is-loading': loading }" style="margin-top: 15px; width: 100%;">
      Register
    </a>

    <p style="text-align: center; margin-top: 30px;">
      <a @click="goBack">&lt; Back</a><br />
    </p>
  </div>
</template>

<script>
  import { post as postHttp } from 'axios';
  import SHA256 from 'crypto-js/sha256';

  import focus from '../../util/focus';
  import { set as setStore } from '../store';
  import { validateEmail } from '../../util/validate';
  import config from '../../config';

  export default {
    name: 'register',
    data () {
      return {
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        password2: '',
        loading: false,
        errorMessage: null,
        emailValid: false,
        passwordValid: false,
        password2Valid: false,
        triedSubmitting: false,
      };
    },
    mounted() {
      focus(this.$refs, 'firstName');
    },
    methods: {
      register() {
        this.triedSubmitting = true;

        if (!this.emailValid || !this.passwordValid || !this.password2Valid) {
          return;
        }

        this.loading = true;

        const hashedPassword = SHA256(this.password).toString();

        postHttp(`${config.protocol}://${config.apiHost}:${config.apiPort}/users/register`, {
          email: this.email,
          password: hashedPassword,
          firstName: this.firstName && this.firstName.trim().length ? this.firstName.trim() : null,
          lastName: this.lastName && this.lastName.trim().length ? this.lastName.trim() : null,
        }).then(({ data }) => {
          this.loading = false;
          this.errorMessage = null;

          this.$toast.open({
            message: 'Successfully registered!',
            type: 'is-success',
          });

          setStore('email', this.email);
          setStore('hashedPassword', hashedPassword);
          setStore('tenants', null);
          this.$router.push('/setup-select');

        }).catch((err) => {
          this.loading = false;

          if (err && err.response && err.response.data && err.response.data.message &&
              err.response.data.message.indexOf('already exists')) {
            this.errorMessage = 'This email address is already taken';
          } else {
            this.errorMessage = 'An unknown error occured';
          }
        });
      },

      goBack() {
        if (!this.loading) {
          this.$router.push('/');
        }
      },

      onEmailChanged(e) {
        this.emailValid = validateEmail(e.target.value);
      },

      onPasswordChanged(e) {
        this.passwordValid = e.target.value.length >= 8;
        this.password2Valid = e.target.value === this.password2;
      },

      onPassword2Changed(e) {
        this.password2Valid = e.target.value === this.password;
      },
    }
  }
</script>
