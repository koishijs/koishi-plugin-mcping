import { Context, Schema, segment, Time } from 'koishi'
import ping from 'ping-minecraft-server'

export interface Config extends ping.Options {}

export const name = 'mcping'

export const Config: Schema<Config> = Schema.object({
  timeout: Schema.number().role('time').default(Time.second * 5).description('最长请求时间。'),
})

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh', require('./locales/zh'))

  ctx.command('mcping <url>')
    .action(async ({ session }, address) => {
      if (!address) return session.text('.invalid-url')
      if (!address.match(/^\w+:\/\//)) address = 'http://' + address

      let host: string, port: number
      try {
        const url = new URL(address)
        host = url.hostname
        port = Number(url.port) || 25565
      } catch (error) {
        return session.text('.invalid-url')
      }

      try {
        const status = await ping(host, port, config)
        const output = [session.text('.overview', status)]
        if (status.description) {
          let text = status.description.text
          if (status.description.extra) text += '\n'
          for (const extra of status.description.extra || []) {
            text += extra.text
          }
          output.unshift(session.text('.description', [text]))
        }
        // data:image/png;base64,
        if (status.favicon) output.unshift(segment.image('base64://' + status.favicon.slice(22)))
        return output.join('\n')
      } catch (e) {
        if (e instanceof ping.Error) {
          return session.text('.' + e.message)
        } else {
          ctx.logger('mcping').warn(e)
          return session.text('.unknown-error')
        }
      }
    })
}
